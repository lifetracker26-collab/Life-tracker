module.exports = async function handler(req, res) {
  try {
    res.status(200).json({
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      privateKeyStartsCorrectly:
        process.env.FIREBASE_PRIVATE_KEY?.includes("BEGIN PRIVATE KEY"),
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
};
