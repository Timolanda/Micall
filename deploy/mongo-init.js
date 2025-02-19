db.createUser({
  user: process.env.MONGO_ROOT_USER,
  pwd: process.env.MONGO_ROOT_PASSWORD,
  roles: [
    { role: "readWrite", db: "micall" },
    { role: "dbAdmin", db: "micall" }
  ]
});

db.createCollection("users");
db.createCollection("emergencies");
db.createCollection("donations");

db.users.createIndex({ "location": "2dsphere" });
db.emergencies.createIndex({ "location": "2dsphere" });
db.donations.createIndex({ "createdAt": 1 }); 