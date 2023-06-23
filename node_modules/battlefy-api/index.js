const axios = require('axios');

const searchApi = axios.create({
    baseURL: 'https://search.battlefy.com/'
})
const tournamentApi = axios.create({
    baseURL: 'https://dtmwra1jsgyb0.cloudfront.net/'
})

const functions = {
    getPopularGames: async () => {
        const response = await searchApi.get('game/popular');
        return response.data;
    },
    getGameTournaments: async (gameId) => {
        const response = await searchApi.get(`tournament/browse/${gameId}`);
        return response.data.tournaments;
    },
    getStaffPicks: async () => {
        const response = await searchApi.get(`spotlight?type=discovery`);
        return response.data;
    },
    getTournamentData: async (id) => {
        const response = await tournamentApi.get(`tournaments/${id}`);
        return response.data;
    },
    getTournamentStageData: async (stage) => {
        const response = await tournamentApi.get(`stages/${stage}`);
        return response.data;
    },
    getTournamentStageMatches: async (stage) => {
        const response = await tournamentApi.get(`stages/${stage}/matches`);
        for (match in response.data) {
            var winner = response.data[match].top.winner ? 'top' : 'bottom'
            response.data[match].winner = winner;
        }
        return response.data;
    },
    getTournamentTeams: async (id) => {
        const response = await tournamentApi.get(`tournaments/${id}/teams`);
        return response.data;
    }
}

module.exports = functions