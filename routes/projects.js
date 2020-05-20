var express = require('express');
var router = express.Router();
let checkOption = {
    id: true,
    name: true,
    members: true
}

module.exports = (db) => {

    let projectsModel = (sql) => {
        return new Promise((resolve, reject) => {
            db.query(sql, (err, result) => {
                let data = result.rows;
                if (data.length == 0) {
                    reject(err)
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

    let pageModel = (sql) => {
        return new Promise((resolve, reject) => {
            db.query(sql, (err, result) => {
                let data = result.rows;
                resolve(data)
                reject(err)
            })
        })
    }

    let addProject = (form) => {
        return new Promise((resolve, reject) => {
            let sql = `INSERT INTO projects (name) VALUES ($1)`
            db.query(sql, [form.projectName], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    let addMembers = (form) => {
        let membersId = form.members;
        let value = [];
        return new Promise((resolve, reject) => {
            db.query(`SELECT MAX (projectid) FROM projects`, (err, data) => {
                let sql = `INSERT INTO members (projectid, userid) VALUES `
                membersId.forEach(id => {
                    value.push(`(${data.rows[0].max}, ${id})`)
                });
                sql += value.join(', ');
                db.query(sql, (err) => {
                    resolve(sql);
                    reject(err);
                    // })
                });
            });
        });
    }

    let deleteProject = (id) => {
        return new Promise((resolve, reject) => {
            let sql = `DELETE FROM projects WHERE projectid = $1`
            db.query(sql, [id], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    let deleteProjectMembers = (id) => {
        return new Promise((resolve, reject) => {
            let sql = `DELETE FROM members WHERE projectid = $1`
            db.query(sql, [id], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    let showDataEdit = (id) => {
        return new Promise((resolve, reject) => {
            let sql = `DELETE FROM members WHERE projectid = $1`
            db.query(sql, [id], (err) => {
                resolve();
                reject(err);
            })
        })
    }


    router.get('/', function (req, res, next) {
        const { checkId, id, checkName, name, checkMember, memberId } = req.query;
        let isSearch = false;
        let query = [];
        let search = "";
        const page = req.query.page || 1;
        const limit = 100;
        const offset = (page - 1) * limit;
        let url = req.url.includes('page') ? req.url : `/projects?page=1&` + req.url.slice(2)

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

        const sqlAll = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,',' ORDER BY users.firstname, users.lastname) members FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid ${search} GROUP BY projects.projectid LIMIT ${limit} OFFSET ${offset}`;

        const sqlMembers = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`;

        const sqlPage = `SELECT COUNT(DISTINCT projectid) as total FROM projects`

        Promise.all([membersModel(sqlMembers), projectsModel(sqlAll), pageModel(sqlPage)])
            .then(result => {
                const [memberList, data, totalPage] = result;
                const pages = Math.ceil(totalPage[0].total / limit);
                res.status(200).render('projects/index', {
                    memberList,
                    data,
                    user: req.session.user,
                    checkOption,
                    pages,
                    totalPage,
                    page,
                    url
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
        res.redirect('/projects');
    })

    router.get('/add', (req, res) => {
        const sqlMembers = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`;
        membersModel(sqlMembers)
            .then((memberList) => {
                res.render('projects/add', {
                    // res.status(200).json({
                    memberList
                })
            })
    })

    router.post('/add', (req, res) => {
        let form = req.body;
        addProject(form)
            .then(() => {
                addMembers(form)
                    .then(() => {
                        res.redirect('/projects');
                    })
                    .catch(err => {
                        console.log(err);
                    })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.get('/delete/:id', (req, res) => {
        const id = parseInt(req.params.id);
        Promise.all([deleteProject(id), deleteProjectMembers(id)])
            .then(() => {
                res.redirect('/projects');
            })
            .catch((err) => {
                console.log(err);
            })
    })

    router.get('/edit/:id', (req, res) => {
        const id = parseInt(req.params.id);
        const sqlMembers = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`;
        membersModel(sqlMembers)
            .then((memberList) => {
                res.render('projects/edit', {
                    // res.status(200).json({
                    memberList
                })
            })
    })


    return router;
}