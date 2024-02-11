const BattlefyAPI = require('battlefy-api');
const { Client, Events, EmbedBuilder, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

let tournamentURL = null
const BEST_OF_ONE_TIME = 15 * 60000;
const BEST_OF_THREE_TIME = 25 * 60000;
const BEST_OF_FIVE_TIME = 35 * 60000;

let stage = null

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    ],
});

client.once(Events.ClientReady, c => {
    console.log(`Logged in as ${c.user.tag}`);
});

client.login(process.env.BOT_TOKEN)


// t: X:XX XM, T: X:XX:XX XM
// d: X/XX/XX, D: Month Day, XXXX
// f: Month Day, XXXX at X:XX XM
// F: Weekday, Month Day, Year at X:XX XM
// R: in X seconds/minutes/hours/days
function timestampGenerator(msTime, disc) {
    return (`<t:${Math.floor(msTime)}:${disc}>`)
}



class Match {
    constructor(match, stageData) {
        //console.log(match)
        this.match = match
        this.stageData = stageData
        this.isComplete = match?.isComplete
        this.topReady = match.top?.readyAt
        this.bottomReady = match.bottom?.readyAt
        this.isOngoing = ((this.topReady != undefined && this.bottomReady != undefined) && this.isComplete != true)
        this.startTime = match.top?.readyAt < match.bottom?.readyAt ? new Date(match.top?.readyAt) : new Date(match.bottom?.readyAt);
        this.matchIdentifier = `${match.matchType === "winner" ? 'C' : 'L'}${match.matchNumber}`
        this.topScore = match.top?.score != undefined ? match.top?.score : 0
        this.bottomScore = match.bottom?.score != undefined ? match.bottom?.score : 0
        this.lastUpdate = new Date(match.updatedAt)
        this.endTime = new Date(this.startTime.getTime() + this.getMatchLength())
        this.matchURL = this.getMatchLink()
        this.matchText = this.getBracketEmbedText()

    }

    getMatchLink() {
    
        const pattern = /https:\/\/battlefy\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/stage\/[^\/]+\/(match|bracket)?\/?/;
        const patternMatch = tournamentURL.match(pattern);
        
        // gets us the organization name
        if (patternMatch) {
            return `https://battlefy.com/${patternMatch[1]}/${patternMatch[2]}/${patternMatch[3]}/stage/${stage}/match/${this.match._id}` // finish this
        } else {
            console.error("ERROR: No Match")
            return ""
        }
    
    
    }

    getBracketEmbedText() {
        let matchLink = this.getMatchLink(match)
        return `[\`${this.matchIdentifier.padStart(3, " ")}\`](${matchLink}): Expires ${timestampGenerator(this.endTime / 1000, 'R')}, Last update: ${timestampGenerator(this.lastUpdate / 1000, 'R')} (${this.topScore}-${this.bottomScore}) \n`
    }

    getMatchLength() {
        const matchRoundNumber = this.match.roundNumber;
        const matchType = this.match.matchType;
        const roundData = this.stageData.bracket.series
        
        // THIS IS WRITTEN ON THE ASSUMPTION THAT FINALS APPEARS _LAST_.
        // IF THIS IS FOUND NOT TO BE THE CASE, THIS CODE MUST CHANGE!
    
        let matchingRound = 0;
        let maxChampRound = 0;
        for (const round of roundData) {
            let itRoundNumber = round.round;
            let itRoundType = round.roundType;
    
            if (itRoundType === "championship") {
                maxChampRound = round.round;
            } else if (itRoundType === "final") {
                itRoundNumber += maxChampRound;
            }
           
    
            if ((matchType === "winner" && itRoundType === "championship" || itRoundType === "final") ||
                    (matchType === "loser" && itRoundType === "consolation")) {
                if (matchRoundNumber === itRoundNumber) {
                    matchingRound = round;
                    //console.log(matchType, matchRoundNumber, "Found")
                    break;
                }
            }
        }
    
        if (matchingRound.numGames === 1) return BEST_OF_ONE_TIME;
        if (matchingRound.numGames === 3) return BEST_OF_THREE_TIME;
        if (matchingRound.numGames === 5) return BEST_OF_FIVE_TIME;
        console.error(`ERROR: No matching set length of ${matchingRound.numGames} has been assigned`)
        return 0;
    }
    

}

class Bracket {
    constructor(bracket) {
        this.matches = bracket
    }

    async sendBracket(interaction) {

        interaction.reply({ content: "Generating data!" })

        const stageData = await BattlefyAPI.getTournamentStageData(stage);
        //console.log(stageData)
        let ongoingSets = []
        for (let match of this.matches) {
            let matchObject = new Match(match, stageData)
            if (matchObject.isOngoing === false) { continue }
            //console.log(matchObject.matchText)
            ongoingSets.push(matchObject)
        }
        //console.log(ongoingSets.length)

        if (ongoingSets.length === 0) {
            interaction.channel.send({
                content: "There are no ongoing sets!"
            })
            return
        }

        ongoingSets.sort((a, b) => a.endTime - b.endTime)
        

        const embeds = []

        let descriptionText = "";
        let descriptionLength = 0;
        const MAX_DESCRIPTION_SIZE = 4096

        for (let match of ongoingSets) {
            //console.log(match.matchIdentifier, match.matchText)
            if (match.matchText.length + descriptionLength <= MAX_DESCRIPTION_SIZE) {
                descriptionText += match.matchText;
                descriptionLength += match.matchText.length
            } else {
                const embed = new EmbedBuilder()
                    .setDescription(descriptionText)
                embeds.push(embed);
                descriptionText = match.matchText;
                descriptionLength = match.matchText.length;
            }
        }
        
        const embed = new EmbedBuilder()
            .setDescription(descriptionText)
        embeds.push(embed);
        
        for (let item of embeds) {
            interaction.channel.send({
                embeds: [item]
            })
        }
    }
}

main();

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'setstage') {
        
        const url = interaction.options.getString('url');
        const pattern = /\/stage\/([a-zA-Z0-9]+)\/(match|bracket)\//;
        const matches = url.match(pattern);

        if (matches && matches.length > 1) {
            tournamentURL = url;
            stage = matches[1];

            interaction.reply({
                content: `Successfully updated the tournament link to ${url}.`
            })

        } else {
            interaction.reply({
                content: `Invalid url.`
            })
        }

    } else if (interaction.commandName === 'update') {

        if (stage == null) {
            interaction.reply({
                content: "You need to set a stage first! \nUse the `/setstage` command to get started!"
            })

        } else {

            try { 
                const updatedMatches = await BattlefyAPI.getTournamentStageMatches(stage)
                bracket = new Bracket(updatedMatches)
                await bracket.sendBracket(interaction)
            } catch (error) {
                console.error(error)
            };

        }
    }
});


async function main() {
  
}


