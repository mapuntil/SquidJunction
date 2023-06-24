require('dotenv').config();
const {REST, Routes, SlashCommandBuilder} = require('discord.js');

console.log("Test")

const commands = [
    {
        name: 'update',
        description: 'Updates all set data'
    },
    new SlashCommandBuilder()
        .setName('setstage')
        .setDescription('Sets the pointed to tournament with the provided link')
        .addStringOption(option =>
            option  
                .setName('url')
                .setDescription('The Battlefy link to the upcoming tournament')
                .setRequired(true)
        ),
];

console.log(process.env.CLIENT_ID)

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    
    try {
        console.log('Registering slash commmands...');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.SJ_GUILD_ID),
            { body: commands }
        )

        console.log('Slash commands were registered successfully')
    } catch (error) {
        console.error(`ERROR: ${error}`);
    }
})();

