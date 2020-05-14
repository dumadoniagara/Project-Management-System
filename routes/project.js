var express = require('express');
var router = express.Router();
let checkOption = {
    id: true,
    name: true,
    members: true
}

module.exports = (db) => {
    router.get('/', function (req, res, next) {
        const { checkId, id, checkName, name, checkMember, memberId } = req.query;
        let isSearch = false;
        let query = [];
        let search = "";

        console.log(req.query);
        if (checkId && id) {
            query.push(`projects.projectid = ${parseInt(id)}`);
            isSearch = true;
        }
        if (checkName && name) {
            query.push(`projects.name LIKE '%${name}%'`);
            isSearch = true;
        }
        if (checkMember && memberId) {
            query.push(`users.userid = ${parseInt(memberId)}`);
            isSearch = true;
        }

        if (isSearch) {
            search += `WHERE ${query.join(' AND ')}`;
        }
        console.log(search);

        let projectsModel = (sql) => {
            return new Promise((resolve, reject) => {
                db.query(sql, (err, result) => {
                    let data = result.rows;
                    if(data.length == 0){
                        return res.send('error data pencarian kosong')
                        // bisa ditamabahin flash (data tidak ditemukan)
                    }
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

        let membersModel = (sql) => {
            return new Promise((resolve, reject) => {
                db.query(sql, (err, result) => {
                    let data = result.rows;
                    resolve(data)
                    reject(err)
                })
            })
        }


        const sqlAll = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,',' ORDER BY users.firstname, users.lastname) members FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid ${search} GROUP BY projects.projectid`;

        const sqlMembers = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`;

        Promise.all([membersModel(sqlMembers), projectsModel(sqlAll)])
            .then(result => {
                const [memberList, data] = result;
                res.status(200).render('projects',{
                    memberList,
                    data,
                    user: req.session.user,
                    checkOption
                })
            })
            .catch(err => {
                res.json({
                    error: true,
                    message: 'error promise query'
                })
            })

    });

    router.post('/option', function (req, res) {
        const { checkId, checkName, checkMembers } = req.body;
        checkOption.id = checkId;
        checkOption.name = checkName;
        checkOption.members = checkMembers;

        console.log(checkOption);
        res.redirect('/project');
    })


    return router;
}