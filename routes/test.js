const bcrypt = require('bcrypt');
const saltRounds = 10;

let user = {
    userid: 23,
    email: "wawanAsli@gmail.com",
    password: "$2b$10$qekTmG5IPXa/P9LwXC7R0efONVRysFrtIOniZ4QMn3.zrPSMJu5bu",
    firstname: "Wawan",
    lastname: "Purwanto"
    }
let data = {
    firstname: "Wawang",
    lastname: "Purwantos",
    email: "wawanAsli@gmail.com",
    password: "1234",
    role: "quality assurance",
    type: "parttime"
    }

let isPassword = (user, data) => {
    if (data.password) {
        bcrypt.hash(data.password, saltRounds, function (err, hash) {
            if (err) {
                console.error();
            }
            return key = [data.firstname, data.lastname, hash, user.userid]
        })
    } else {
        return key = [data.firstname, data.lastname, user.userid]
    }
}

console.log(isPassword(user,data))