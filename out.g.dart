import "package:nyxx_commands/src/context/chat_context.dart"
    as package_nyxx_commands__src__context__chat_context___dart;
import "package:veil_faucet/commands/get_coins_command.dart"
    as package_veil_faucet__commands__get_coins_command___dart;
import 'package:nyxx_commands/src/mirror_utils/mirror_utils.dart';
import 'file:///D:/Develop/mining/veil-dart/veil-faucet/bin/veil_faucet.dart'
    as _main show main;
import "dart:core";

// Auto-generated file
// DO NOT EDIT

// Function data

const Map<dynamic, FunctionData> functionData = {
  package_veil_faucet__commands__get_coins_command___dart.commandName:
      FunctionData([
    ParameterData(
      name: "context",
      type: const RuntimeType<
          package_nyxx_commands__src__context__chat_context___dart
          .ChatContext>.allowingDynamic(),
      isOptional: false,
      description: null,
      defaultValue: null,
      choices: null,
      converterOverride: null,
      autocompleteOverride: null,
      localizedDescriptions: null,
      localizedNames: null,
    ),
  ]),
};
// Main function wrapper
void main(List<String> args) {
  loadData(functionData);

  _main.main(args);
}
