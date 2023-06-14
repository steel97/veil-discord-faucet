import { ChatInputCommandInteraction, Client, Events, GatewayIntentBits, ModalSubmitInteraction, REST, Routes } from "discord.js";
import "dotenv/config";
import { commandName as getCoinsCommandName, commandData as getCoinsCommandData, execute as getCoinsCommandExecute } from "./commands/GetCoinsCommand";
import { modalId as addressModalId, execute as addressModalExecute } from "./modals/AddressModal";
import { runService as payoutRunService } from "./services/PayoutService";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (!interaction.inGuild()) return;
        if (interaction.guildId != process.env.DISCORD_SERVER_ID) return; // can be limited through discord bot configuration
        if (interaction.channelId != process.env.DISCORD_TARGET_CHANNEL_ID) { // limit bot requests to specific channel
            if (interaction.isModalSubmit()) {
                await (interaction as ModalSubmitInteraction).editReply("command not allowed in this channel");
            } else {
                await (interaction as ChatInputCommandInteraction).editReply("command not allowed in this channel");
            }
            return;
        }

        if (interaction.isModalSubmit()) {
            switch (interaction.customId) {
                case addressModalId:
                    await addressModalExecute(interaction);
                    break;
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const { commandName } = interaction;
        switch (commandName) {
            case getCoinsCommandName:
                await getCoinsCommandExecute(interaction);
                return;
        }
    } catch (e) {
        console.error(`failed at interaction ${e}`);
    }
});

client.login(process.env.DISCORD_TOKEN);


const rest = new REST().setToken(process.env.DISCORD_TOKEN);
(async () => {
    payoutRunService(client);

    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_SERVER_ID),
            {
                body: [
                    getCoinsCommandData
                ]
            },
        );

        console.log(`Successfully reloaded application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();