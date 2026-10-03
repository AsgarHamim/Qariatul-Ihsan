const { isAuthenticated } = require('./_lib/auth');

module.exports = async (req, res) => {
  return res.status(200).json({ loggedIn: isAuthenticated(req) });
};
