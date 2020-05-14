var express = require('express');
var router = express.Router();
let checkOption = {
    id : true,
    name : true,
    members : true
}

module.exports = (db) => {
    router.get('/', function (req, res, next) {
        let projectsModel = (sql) => {
            return new Promise((resolve, reject) => {
                db.query(sql, (err, result) => {
                    let data = result.rows;
                    for (i = 0; i < data.length; i++) {
                        if (data[i].members != null) {
                            let memberList = data[i].members.split(',');
                            data[i].members = memberList;
                        }
                    }
                    resolve(data)
                    reject(err)
                })
            })
        }
        const sql = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,',' ORDER BY users.firstname, users.lastname) members FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid GROUP BY projects.projectid`;


        projectsModel(sql)
            .then(data => {
                res.render('projects',{
                    data,
                    user : req.session.user,
                    checkOption
                })
            })
    });

    router.post('/option', function (req, res) {
        const {checkId, checkName, checkMembers} = req.body;
        checkOption.id = checkId;
        checkOption.name = checkName;
        checkOption.members = checkMembers;

        console.log(checkOption);
        res.redirect('/project');
      })

    return router;
}