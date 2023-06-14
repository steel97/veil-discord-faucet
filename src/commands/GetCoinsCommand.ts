import { ActionRowBuilder, ChatInputCommandInteraction, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { modalId } from "../modals/AddressModal";
import { checkTimings } from "../core/DB";
import { getUnixTimestamp, toTimeString } from "../core/Utility";

export const commandName = "getcoins";

export const commandData = new SlashCommandBuilder()
    .setName(commandName)
    .setDescription("get some veil");

export const execute = async (interaction: ChatInputCommandInteraction) => {
    try {
        checkTimings(interaction.user.id, async () => {
            const modal = new ModalBuilder()
                .setCustomId(modalId)
                .setTitle("Type in your address");

            const addressInput = new TextInputBuilder()
                .setCustomId('addressInput')
                .setLabel("Wallet address bv/sv")
                .setRequired(true)
                .setStyle(TextInputStyle.Short);

            const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(addressInput);
            modal.addComponents(actionRow);
            await interaction.showModal(modal);
        }, async (entryTimestamp: number | null) => {
            if (entryTimestamp != null)
                await interaction.reply({ content: `Too early! You can request free coins after ${toTimeString(entryTimestamp - getUnixTimestamp())}` });
            else
                await interaction.reply({ content: "Failed to check timestamp!" });
        });

    } catch (e) {
        console.error(`error inside GetCoinsCommand ${e}`)
    }
};
