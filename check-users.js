const admin = require('./api/_utils').admin;
(async () => {
  const listUsersResult = await admin.auth().listUsers();
  listUsersResult.users.forEach(u => {
    console.log(u.uid, u.email);
  });
  process.exit();
})();
