import 'package:dotenv/dotenv.dart';
import 'package:nyxx/nyxx.dart';
import 'package:veil_faucet/core/db.dart';
import 'package:veil_light_plugin/veil_light.dart';

Future processPayout(
  LightwalletAddress address,
  NyxxGateway client,
  DotEnv env,
) async {
  try {
    var payoutsPerCycle = int.parse(env['FAUCET_PAYOUTS_PER_CYCLE'] ?? '1');
    var payoutAmount = double.parse(env['FAUCET_PAYOUTS_AMOUNT'] ?? '1');

    var addresses = fetchQueue(payoutsPerCycle, payoutAmount);
    if (addresses.isEmpty) {
      return;
    }

    var mempoolRes = await RpcRequester.send(
      RpcRequest(jsonrpc: '1.0', method: 'getrawmempool', params: []),
    );
    var mempool = GetRawMempool.fromJson(mempoolRes).result;

    List<CVeilRecipient> recipients = [];
    for (var a in addresses) {
      recipients.add(a.recipient);
    }
    await address.fetchTxes();

    var preparedUtxos = (await address.getUnspentOutputs())
        .where((utxo) => !mempool!.contains(utxo.getId() ?? ''))
        .toList();
    var utxos = preparedUtxos
      ..sort(
        (a, b) =>
            a.getAmount(mainNetParams).compareTo(b.getAmount(mainNetParams)),
      );

    List<CWatchOnlyTxWithIndex> targetUtxos = [];
    double targetAmount = 0;
    for (var a in recipients) {
      targetAmount += a.amount;
    }

    var currentAmount =
        (mainNetParams.CENT.toDouble() / mainNetParams.COIN.toDouble()); // fee
    for (var utxo in utxos) {
      currentAmount += utxo.getAmount(mainNetParams);
      targetUtxos.add(utxo);
      if (currentAmount >= targetAmount) {
        break;
      }
    }

    var actualBalance = await address.getBalance([]);

    if (currentAmount >= targetAmount) {
      var rawTx = await address.buildTransaction(
        recipients,
        targetUtxos,
        false,
      );
      if (rawTx.txdata == null) {
        // error
        print('failed to build transaction!'); // error
      } else {
        var res = await Lightwallet.publishTransaction(rawTx.txdata!);
        if (res.errorCode != null || res.txid == null) {
          print(
            'failed to publish transaction! code = ${res.errorCode}, ${res.message}',
          ); // error
        } else {
          print(
            'Made payout, txid = ${res.txid}, count = ${recipients.length}',
          ); // log

          // save state to db
          if (!setQueueState(addresses)) {
            print('failed to update db');
            return;
          }

          // Fetch the channel
          var channelId = Snowflake.parse(env['DISCORD_TARGET_CHANNEL_ID']!);
          var txExplorerUrl = env['VEIL_EXPLORER_TX'];
          var guild = await client.guilds.get(
            Snowflake.parse(env['DISCORD_SERVER_ID']!),
          );
          var guildChannels = await guild.fetchChannels();
          try {
            var channel = guildChannels.where((a) => a.id == channelId).first;
            (channel as TextChannel).sendMessage(
              MessageBuilder(
                content:
                    'Made payout to ${recipients.length} user(s)! tx: $txExplorerUrl${res.txid}',
                flags: MessageFlags.suppressEmbeds,
              ),
            );
          } catch (e) {
            // ignore
          }
        }
      }
    } else {
      if (actualBalance < targetAmount) {
        print('not enough coins! $currentAmount < $targetAmount'); // error
      } else {
        print('waiting for change'); // log
      }
    }
  } catch (e) {
    print('payout failed with $e'); // error
  }
}

Future runService(NyxxGateway client, DotEnv env) async {
  var wallet = await Lightwallet.fromMnemonic(
    mainNetParams,
    env['VEIL_MNEMONIC']!.split(' '),
    password: env['VEIL_ENCRYPTION_PASSWORD'] ?? '',
    storageName: 'faucet-storage',
    storagePath: './faucet-storage',
  );
  var account = LightwalletAccount(wallet);
  var address = account.getAddress(AccountType.STEALTH);
  var delay = int.parse(env['FAUCET_PAYOUTS_DELAY'] ?? '60000');
  while (true) {
    await processPayout(address, client, env);
    await Future.delayed(Duration(milliseconds: delay));
  }
}
