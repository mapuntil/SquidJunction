const BattlefyAPI = require('battlefy-api');
const { Client, Events, EmbedBuilder, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

let tournamentURL = null
const  BEST_OF_ONE_TIME = 15 * 60000;
const BEST_OF_THREE_TIME = 25 * 60000;
const BEST_OF_FIVE_TIME = 35 * 60000;

let stage = null

/*

      |
   __|
  | |

*/

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    //GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    ],
});

client.once(Events.ClientReady, c => {
    //console.log(`Logged in as ${c.user.tag}`);
});

client.login(process.env.BOT_TOKEN)

class Tournament {
    constructor(stage) {
        this.stage = stage;
    }

    async updateStageData() {
        try {
            const games = await BattlefyAPI.getTournamentStageMatches(this.stage)
            return games;
        
        } catch (error) {
            console.error(error);
        };
    }
}

// t: X:XX XM, T: X:XX:XX XM
// d: X/XX/XX, D: Month Day, XXXX
// f: Month Day, XXXX at X:XX XM
// F: Weekday, Month Day, Year at X:XX XM
// R: in X seconds/minutes/hours/days
function timestampGenerator(msTime, disc) {
    return (`<t:${Math.floor(msTime)}:${disc}>`)
}

async function getMatchLink(match) {
    tourneyData = await BattlefyAPI.getTournamentData("6494fd2b42963e0cd84e4dc9") // gets me tournament data

    const pattern = /https:\/\/battlefy\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/stage\/[^\/]+\/(match|bracket)?\/?/;
    const patternMatch = tournamentURL.match(pattern);
    
    // gets us the organization name
    if (match) {
      const orgName = patternMatch[1];
      const tournamentID = patternMatch[3];
      // this is an access of a private variable
      const matchID = match._id;

      //console.log(match)
      
      return `https://battlefy.com/${orgName}/${tourneyData?.slug}/${tournamentID}/stage/${stage}/match/${matchID}` // finish this

    } else {
        console.error("ERROR: No Match")
        return ""
    }
    
    //const matchID = match.stats.matchID
    //const tournamentID = match.stats.tournamentID   

    // https://battlefy.com/squid-junction/squid-junction-45/6488ae7ee23ab00ccf5b234c/stage/6488ae9c43a2d45dbd34a3ab/match/648e385a4d040f5057933d51

}

function getMatchLength(match, stageData) {
    const matchRoundNumber = match.roundNumber;
    const matchType = match.matchType;
    const roundData = stageData.bracket.series
    // THIS IS WRITTEN ON THE ASSUMPTION THAT FINALS APPEATS _LAST_.
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
                break;
            }
        }
    }

    if (matchingRound.numGames === 1) return BEST_OF_ONE_TIME;
    if (matchingRound.numGames === 3) return BEST_OF_THREE_TIME;
    if (matchingRound.numGames === 5) return BEST_OF_FIVE_TIME;
    console.error("ERROR: No matching set length has been assigned")
    return 0;

}

class Pair {
    constructor(first, second) {
        this.first = first;
        this.second = second;
    }
}

function getMatchScore(match) {
    const topScore = match.top?.score != undefined ? match.top?.score : 0;
    const bottomScore = match.bottom?.score != undefined ? match.bottom?.score : 0;

    return (new Pair(topScore, bottomScore))
}

function getMatchIdentifier(match) {
    return (`${match.matchType === "winner" ? 'C' : 'L'}${match.matchNumber}`)
}

function getLastUpdate(match) {
    return (new Date(match.updatedAt))
}

function unixToTime(time) {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    return (new Pair(minutes, seconds))
}

class Bracket {
    constructor(bracket) {
        this.matches = bracket
    }

    async sendBracket(interaction) {
        let replyContent = await this.getContent()
        //console.log(replyContent)

        if (replyContent.length === 0) {
            interaction.reply({
                content: "There are no ongoing sets!"
            })
            return
        }

        replyContent.sort((a, b) => a.endOfSetTime - b.endOfSetTime);

        const embeds = []

        //replyContent = replyContent.substring(0, 2000)

        let descriptionText = "";
        let descriptionLength = 0;
        const MAX_DESCRIPTION_SIZE = 4096

        for (let match of replyContent) {
            
            const addText = `[\`${match.matchIdentifier}\`](${match.matchLink}): Expires ${timestampGenerator(match.endOfSetTime, 'R')}, Last update: ${timestampGenerator(match.lastUpdate, 'R')} (${match.matchScore.top}-${match.matchScore.bottom}) \n`
            if (addText.length + descriptionLength <= MAX_DESCRIPTION_SIZE) {
                descriptionText += addText;
                descriptionLength += addText.length
            } else {
                
                const embed = new EmbedBuilder()
                    .setDescription(descriptionText)
                //console.log(descriptionLength)
                embeds.push(embed);
                descriptionText = addText;
                descriptionLength = addText.length;
            }
        }

        
        const embed = new EmbedBuilder()
            .setDescription(descriptionText)
        embeds.push(embed);
        //console.log(embeds);
        interaction.reply({
            content: `There ${embeds.length > 1 ? "are" : "is"} \`${embeds.length}\` set${embeds.length > 1 ? 's' : ''} ongoing.`
        })

        for (let item of embeds) {
            interaction.channel.send({
                embeds: [item]
            })
        }

    }

    async getContent() {
        // sort matches by time remaining in ascending order
        let fullContent = [];

        
        for (let match of this.matches) {
            if (match.top?.readyAt === undefined || 
                match.bottom?.readyAt === undefined || 
                match?.isComplete === true) {
                continue;
            }

            


            // if we got here, we found a match that has started, or is being checked into
            const startTime = match.top?.readyAt < match.bottom?.readyAt ? new Date(match.top?.readyAt) : new Date(match.bottom?.readyAt);
            // const currentTime = new Date();
            // const setTime = unixToTime(currentTime - startTime)

            const matchLink = await getMatchLink(match)
            const matchIdentifier = getMatchIdentifier(match)

            const stageData = await BattlefyAPI.getTournamentStageData(stage);
            const matchTime = getMatchLength(match, stageData)
            
            const endTime = new Date(startTime.getTime()+ matchTime)

        
            const matchScore = getMatchScore(match)
            const lastUpdate = getLastUpdate(match)

            const newContent = {
                endOfSetTime: endTime / 1000,
                matchLink: matchLink,
                matchIdentifier: matchIdentifier,
                matchScore: {
                    top: matchScore.first,
                    bottom: matchScore.second
                },
                lastUpdate: lastUpdate / 1000

            }

            fullContent = [...fullContent, newContent];

        }
        return fullContent;
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
            //console.log(`Updated stage is ${stage}`)
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
            tournament = new Tournament(stage);
            const updatedMatches = await tournament.updateStageData();
            bracket = new Bracket(updatedMatches)

            await bracket.sendBracket(interaction)
        }
    }
});


async function main() {
    
}


