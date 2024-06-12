const DatabaseFiller = require('../services/DatabaseFiller');

const fillDatabase = async (req, res) => {
    const filler = new DatabaseFiller();
    await filler.fillAvailabilityDatabase();
    res.send('Database filled');
};

module.exports = { fillDatabase };
