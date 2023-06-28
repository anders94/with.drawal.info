const { SiweMessage } = require('siwe');

module.exports = {
    post: async (req, res, next) => {
        const { message, signature } = req.body;
        const siweMessage = new SiweMessage(message);
        try {
            await siweMessage.verify({ signature });
            res.send(true);
        }
        catch {
            res.send(false);

        }

    }

};
