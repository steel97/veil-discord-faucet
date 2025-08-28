import 'dart:io' as io;
import 'package:dotenv/dotenv.dart';
import 'package:sqlite3/sqlite3.dart';
import 'package:veil_faucet/core/utility.dart';
import 'package:veil_light_plugin/veil_light.dart';

const dbPath = './db.sqlite';

Database? dbInstance;
DotEnv? envInstance;

Future initDb(DotEnv env) async {
  envInstance = env;
  dbInstance = sqlite3.open(dbPath);

  if (!await io.File(dbPath).exists()) {
    dbInstance?.execute('''
      CREATE TABLE faucet_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT,
        user_id TEXT,
        "timestamp" INTEGER,
        used INTEGER DEFAULT (0)
      );
    ''');
  }
}

void disposeDb() {
  dbInstance?.dispose();
}

// check timing (return null if success, wait time otherwise)
int? checkTimings(String userId) {
  ResultSet? resultSet = dbInstance?.select(
    '''
      SELECT "timestamp"  FROM faucet_queue WHERE user_id = ? ORDER BY "timestamp" DESC LIMIT 1;
    ''',
    [userId],
  );

  if (resultSet == null || resultSet.isEmpty) {
    return null;
  }

  for (var k in resultSet) {
    var timestamp = k['timestamp'];
    var ts = getUnixTimestamp();
    var ev = 3600;
    if (envInstance != null) {
      ev = int.parse(envInstance!['FAUCET_TIMESTAMP_LIMIT']!);
    }
    var mts = timestamp + ev;
    if (mts > ts) {
      return mts;
    }

    return null;
  }

  return null;
}

bool queueRequest(String addressVal, String userId) {
  try {
    final stmt = dbInstance?.prepare('''
      INSERT INTO faucet_queue (address, user_id, "timestamp", used) VALUES(?, ?, ${getUnixTimestamp()}, 0);
    ''');

    stmt?.execute([addressVal, userId]);
    stmt?.dispose();

    return true;
  } catch (e) {
    return false;
  }
}

int? getQueueSize() {
  ResultSet? resultSet = dbInstance?.select('''
      SELECT COUNT(*) as cnt FROM faucet_queue WHERE used = 0;
  ''');

  if (resultSet == null || resultSet.isEmpty) {
    return null;
  }

  return resultSet.first['cnt'];
}

class TempAddress {
  final int id;
  final CVeilRecipient recipient;

  TempAddress(this.id, this.recipient);
}

List<TempAddress> fetchQueue(int payoutsPerCycle, double amount) {
  ResultSet? resultSet = dbInstance?.select('''
      SELECT "id", "address"  FROM faucet_queue WHERE used=0 ORDER BY "timestamp" ASC LIMIT $payoutsPerCycle;
  ''', []);

  if (resultSet == null || resultSet.isEmpty) {
    return [];
  }

  List<TempAddress> addresses = [];
  for (var rowAny in resultSet) {
    try {
      addresses.add(
        TempAddress(
          rowAny['id'],
          CVeilRecipient(
            CVeilAddress.parse(mainNetParams, rowAny['address'])!,
            amount,
          ),
        ),
      );
    } catch (e) {
      // TO-DO: log
    }
  }

  return addresses;
}

bool setQueueState(List<TempAddress> addresses) {
  try {
    var query = '';
    for (var index = 0; index < addresses.length; index++) {
      query +=
          '''
        id = '${addresses[index].id}'
      ''';

      if (index < addresses.length - 1) {
        query += ' OR ';
      }
    }

    final stmt = dbInstance?.prepare('''
      UPDATE faucet_queue SET used = 1 WHERE $query;
    ''');

    stmt?.execute([]);
    stmt?.dispose();

    return true;
  } catch (e) {
    return false;
  }
}
