const bcrypt = require("bcryptjs");

const password = "BFLogin1!"; // Replace with the desired password

bcrypt.hash(password, 10, (err, hash) => {
    if (err) throw err;
    console.log("Hashed password:", hash);
});
// $2a$10$akJfMyPPWANBqxhBQ1qa3OeFpNocvdPqMroD4SHiTc5zEVUDerlzm 
// INSERT INTO admins (username, password) VALUES ('aGuevara', '$2a$10$akJfMyPPWANBqxhBQ1qa3OeFpNocvdPqMroD4SHiTc5zEVUDerlzm');


