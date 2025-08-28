import 'dart:io';

import 'package:dotenv/dotenv.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_commands/nyxx_commands.dart';
import 'package:veil_faucet/commands/get_coins_command.dart';
import 'package:veil_faucet/core/db.dart';
import 'package:veil_faucet/services/payout_service.dart';

void main(List<String> arguments) async {
  var env = DotEnv();
  env.load(['.env']);

  CommandsPlugin commands = CommandsPlugin(
    prefix: (message) => '/',
    guild: Snowflake.parse(env['DISCORD_SERVER_ID']!),
    options: CommandsOptions(logErrors: true),
  );

  print(env['DISCORD_TOKEN']);

  final client = await Nyxx.connectGateway(
    env['DISCORD_TOKEN']!,
    GatewayIntents.guilds,
    options: GatewayClientOptions(
      plugins: [commands, logging, cliIntegration, ignoreExceptions],
    ),
  );

  ProcessSignal.sigint.watch().listen(close);
  if (!Platform.isWindows) ProcessSignal.sigterm.watch().listen(close);

  await initDb(env);
  await registerCommand(commands);
  await runService(client, env);
}

Future close(ProcessSignal signal) async {
  disposeDb();
}
