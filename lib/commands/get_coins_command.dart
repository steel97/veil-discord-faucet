import 'package:nyxx/nyxx.dart';
import 'package:nyxx_commands/nyxx_commands.dart';
import 'package:veil_faucet/core/db.dart';
import 'package:veil_faucet/core/utility.dart';
import 'package:veil_light_plugin/veil_light.dart';

const commandName = 'getcoins';
const commandDescription = 'get some veil';

Future registerCommand(CommandsPlugin commands) async {
  var cmd = ChatCommand(
    commandName,
    commandDescription,
    id(commandName, (ChatContext context) async {
      var userId = context.user.id.toString();
      var entryTimestamp = checkTimings(userId);
      if (entryTimestamp != null) {
        await context.respond(
          MessageBuilder(
            content:
                'Too early! You can request free coins after ${toTimeString(entryTimestamp - getUnixTimestamp())}',
          ),
        );

        return;
      }

      var ctx = context as InteractionInteractiveContext;
      var res = await ctx.getModal(
        title: 'Type in your address',
        components: [
          TextInputBuilder(
            customId: 'addressInput',
            style: TextInputStyle.short,
            label: 'Wallet address bv/sv',
          ),
        ],
      );

      var actionRow = res.interaction.data.components[0] as ActionRowComponent;
      var inp = actionRow.components
          .where((a) => a.type == MessageComponentType.textInput)
          .first;
      if (inp is TextInputComponent) {
        var addressValue = inp.value;
        // check address validity
        try {
          var addr = CVeilAddress.parse(mainNetParams, addressValue!);
          if (addr == null) {
            throw Error();
          }
          // check timing
          var secondaryCheck = checkTimings(userId);
          if (secondaryCheck == null) {
            await addToQueue(addressValue, context);
          } else {
            await context.respond(
              MessageBuilder(
                content:
                    'Too early! You can request free coins after ${toTimeString(secondaryCheck - getUnixTimestamp())}',
              ),
            );
          }
        } catch (e) {
          await context.respond(
            MessageBuilder(
              content:
                  'Specified address seems to be invalid, please try again!',
            ),
          );
        }
      }
    }),
  );

  commands.addCommand(cmd);
}

Future addToQueue(String addressVal, ChatContext ctx) async {
  try {
    if (!queueRequest(addressVal, ctx.user.id.toString())) {
      await ctx.respond(
        MessageBuilder(content: 'Failed to add user to queue!'),
      );
      return;
    }

    var queueSize = getQueueSize();
    await ctx.respond(
      MessageBuilder(
        content: 'You successfully added to queue! Queue size: $queueSize',
      ),
    );
  } catch (e) {
    await ctx.respond(MessageBuilder(content: 'Failed to add user to queue!'));
  }
}
