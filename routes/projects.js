var express = require('express');
var router = express.Router();
var moment = require('moment');
const path = require('path');

let checkOption = {
    id: true,
    name: true,
    members: true
}

let checkOptionMember = {
    id: true,
    name: true,
    position: true
}

let checkOptionIssue = {
    id: true,
    subject: true,
    tracker: true,
    description: true,
    status: true,
    priority: true,
    assignee: true,
    startDate: true,
    dueDate: true,
    estimateTime: true,
    spentTime: true,
    done: true,
    targetVersion: true,
    author: true,
    createdDate: true,
    updatedDate: true,
    closedDate: true,
    file: true,
}

const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
}

module.exports = (db) => {

    function projectsModel(search, limit, offset) {
        return new Promise((resolve, reject) => {
            const sqlAll = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,',' ORDER BY users.firstname, users.lastname) members FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid ${search} GROUP BY projects.projectid LIMIT ${limit} OFFSET ${offset}`;
            db.query(sqlAll, (err, result) => {
                let data = result.rows;
                if (data.length == 0) {
                    resolve(data = []);
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

    function usersModel() {
        return new Promise((resolve, reject) => {
            const sqlMembers = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`;
            db.query(sqlMembers, (err, result) => {
                let data = result.rows;
                resolve(data)
                reject(err)
            })
        })
    }

    function usersModelbyProjectId(projectid, search) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT CONCAT(firstname, ' ', lastname) AS fullname, members.role, members.userid FROM users LEFT JOIN members ON users.userid = members.userid WHERE members.projectid = $1 ${search} ORDER BY fullname`;
            db.query(sql, [projectid], (err, result) => {
                let data = result.rows;
                resolve(data)
                reject(err)
            })
        })
    }


    let pageModel = () => {
        return new Promise((resolve, reject) => {
            const sqlPage = `SELECT COUNT(DISTINCT projectid) as total FROM projects`
            db.query(sqlPage, (err, result) => {
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

    function addMembers(form) {
        let values = [];
        return new Promise((resolve, reject) => {
            db.query(`SELECT MAX (projectid) FROM projects`, (err, data) => {
                let projectId = data.rows[0].max;
                resolve(projectId);
                reject(err);
                let sqlInsert = `INSERT INTO members (projectid, userid) VALUES `
                if (typeof form.members == 'object') {
                    form.members.forEach(item => {
                        values.push(`(${projectId}, ${item})`);
                    })
                    sqlInsert += values.join(', ');
                } else {
                    sqlInsert += `(${projectId}, ${form.members})`
                }
                db.query(sqlInsert, (err) => {
                    resolve();
                    reject(err);
                });
            });
        });
    }

    function deleteProject(id) {
        return new Promise((resolve, reject) => {
            let sql = `DELETE FROM projects WHERE projectid = $1`
            db.query(sql, [id], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function deleteProjectMembers(id) {
        return new Promise((resolve, reject) => {
            let sql = `DELETE FROM members WHERE projectid = $1`
            db.query(sql, [id], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function showMembers(id) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT * FROM members WHERE projectid = $1`, [id], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }

    function showUser(userid, projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT members.userid, CONCAT(firstname,' ', lastname) AS fullname, members.role FROM members LEFT JOIN users ON members.userid = users.userid WHERE members.userid = $1 AND members.projectid = $2`, [userid, projectid], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }

    function showMembersWithConstraint(projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT userid, CONCAT(firstname,' ', lastname) AS fullname FROM users WHERE userid NOT IN (SELECT userid FROM members WHERE projectid = $1)`, [projectid], (err, data) => {
                let users = data.rows;
                resolve(users);
                reject(err);
            })
        })
    }

    function showProject(projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT name, projectid FROM projects WHERE projectid = $1`, [projectid], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }
    function updateProjectName(form) {
        return new Promise((resolve, reject) => {
            db.query(`UPDATE projects SET name = $1 WHERE projectid = $2`, [form.projectName, form.projectId], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function deleteMember(form) {
        return new Promise((resolve, reject) => {
            let sqlDelete = `DELETE FROM members WHERE projectid = $1`;
            db.query(sqlDelete, [parseInt(form.projectId)], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function updateProjectMember(form) {
        return new Promise((resolve, reject) => {
            let values = [];
            let sqlInsert = `INSERT INTO members (projectid, userid) VALUES `
            if (typeof form.members == 'object') {
                form.members.forEach(item => {
                    values.push(`(${form.projectId}, ${item})`);
                })
                sqlInsert += values.join(', ');
            } else {
                sqlInsert += `(${form.projectId}, ${form.members})`
            }
            db.query(sqlInsert, (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function addProjectMember(form) {
        return new Promise((resolve, reject) => {
            let sqlInsert = `INSERT INTO members (projectid, userid, role) VALUES ($1,$2,$3)`
            db.query(sqlInsert, [form.projectId, form.user, form.role], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function editMember(form, userid) {
        return new Promise((resolve, reject) => {
            db.query(`UPDATE members SET role = $1 WHERE projectid = $2 AND userid = $3`, [form.role, form.projectId, userid], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function deleteMemberById(projectid, userid) {
        return new Promise((resolve, reject) => {
            let sqlDelete = `DELETE FROM members WHERE projectid = $1 AND userid = $2`;
            db.query(sqlDelete, [projectid, userid], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function showIssues(projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT issues.*, CONCAT(users.firstname,' ',users.lastname) as authorname FROM issues LEFT JOIN users ON issues.author = users.userid WHERE issues.projectid = $1 ORDER BY issues.issueid ASC`, [projectid], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }

    function showParentIssues(projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT subject, tracker FROM issues WHERE projectid = $1 ORDER BY issueid ASC`, [projectid], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }

    function showIssueById(projectid, issueid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT issues.*, CONCAT(users.firstname,' ',users.lastname) as authorname FROM issues LEFT JOIN users ON issues.author = users.userid WHERE issues.projectid = $1 AND issues.issueid = $2 `, [projectid, issueid], (err, data) => {
                let result = data.rows[0];
                resolve(result);
                reject(err);
            })
        })
    }

    function addIssue(form, authorid, fileName) {
        return new Promise((resolve, reject) => {
            if (fileName) {
                let sqlInsert = `INSERT INTO issues (projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, files, createddate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`
                db.query(sqlInsert, [form.projectId, form.tracker, form.subject, form.description, form.status, form.priority, form.assignee, form.startDate, form.dueDate, form.estimatedTime, form.done, authorid, fileName], (err) => {
                    resolve();
                    reject(err);
                })
            } else {
                let sqlInsert = `INSERT INTO issues (projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, createddate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`
                db.query(sqlInsert, [form.projectId, form.tracker, form.subject, form.description, form.status, form.priority, form.assignee, form.startDate, form.dueDate, form.estimatedTime, form.done, authorid], (err) => {
                    resolve();
                    reject(err);
                })
            }
        })
    }

    function updateIssue(issueid, form) {
        return new Promise((resolve, reject) => {
            if (form.file) {
                let sqlInsert = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assignee = $5, duedate = $6, done = $7, parenttask = $8, spenttime = $9, targetversion = $10,  files = $11, updateddate = $12 WHERE issueid = $13`
                db.query(sqlInsert, [form.subject, form.description, form.status, form.priority, parseInt(form.assignee), form.dueDate, parseInt(form.done), form.parentTask, parseInt(form.spentTime), form.targetVersion, form.file, 'NOW()', issueid], (err) => {
                    resolve();
                    reject(err);
                })
            } else {
                let sqlInsert = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assignee = $5, duedate = $6, done = $7, parenttask = $8, spenttime = $9, targetversion = $10, updateddate = $11 WHERE issueid = $12`
                db.query(sqlInsert, [form.subject, form.description, form.status, form.priority, parseInt(form.assignee), form.dueDate, parseInt(form.done), form.parentTask, parseInt(form.spentTime), form.targetVersion, 'NOW()', issueid], (err) => {
                    resolve();
                    reject(err);
                })
            }
        })
    }

    function deleteIssue(projectid, issueid) {
        return new Promise((resolve, reject) => {
            let sql = `DELETE FROM issues WHERE projectid = $1 AND issueid = $2`
            db.query(sql, [projectid, issueid], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function showAssignee(projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT users.userid, CONCAT(firstname,' ', lastname) AS fullname FROM members LEFT JOIN users ON members.userid = users.userid WHERE members.projectid = $1`, [projectid], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }



    // ============== ROUTES =========================================================

    router.get('/', isLoggedIn, function (req, res, next) {
        const { checkId, id, checkName, name, checkMember, memberId } = req.query;
        let isSearch = false;
        let query = [];
        let search = "";
        const page = req.query.page || 1;
        const limit = 100;
        const offset = (page - 1) * limit;
        let url = req.url.includes('page') ? req.url : `/projects?page=1&` + req.url.slice(2)

        if (checkId && id) {
            query.push(`projects.projectid = ${parseInt(id)}`);
            isSearch = true;
        }
        if (checkName && name) {
            query.push(`projects.name ILIKE '%${name}%'`);
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

        Promise.all([usersModel(), projectsModel(search, limit, offset), pageModel()])
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
                console.log(err);
            })
    });

    router.post('/option', isLoggedIn, function (req, res) {
        const { checkId, checkName, checkMembers } = req.body;
        checkOption.id = checkId;
        checkOption.name = checkName;
        checkOption.members = checkMembers;
        // console.log(checkOption);
        res.redirect('/projects');
    })

    router.get('/add', isLoggedIn, (req, res) => {
        const sqlMembers = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`;
        usersModel(sqlMembers)
            .then((memberList) => {
                res.render('projects/add', {
                    // res.status(200).json({
                    memberList
                })
            })
            .catch(err => {
                console.log(err)
            })
    })

    router.post('/add', isLoggedIn, (req, res) => {
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

    router.get('/delete/:id', isLoggedIn, (req, res) => {
        const id = parseInt(req.params.id);
        Promise.all([deleteProject(id), deleteProjectMembers(id)])
            .then(() => {
                res.redirect('/projects');
            })
            .catch((err) => {
                console.log(err);
            })
    })

    router.get('/edit/:id', isLoggedIn, (req, res) => {
        const id = parseInt(req.params.id);
        Promise.all([usersModel(), showMembers(id), showProject(id)])
            .then((data) => {
                let [memberList, memberProject, projectName] = data;
                let membersId = [];
                memberProject.forEach(item => {
                    membersId.push(item.userid);
                })

                res.render('projects/edit', {
                    // res.status(200).json({
                    memberList,
                    membersId,
                    projectName
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.post('/edit', isLoggedIn, (req, res) => {
        let form = req.body;
        Promise.all([updateProjectName(form), deleteMember(form)])
            .then(() => {
                updateProjectMember(form)
                    .then(() => {
                        res.redirect('/projects')
                    })
                    .catch(err => {
                        console.log(err);
                    })
            })
            .catch(err => {
                console.log(err);
            })
    })



    // =============== PROJECT DETAIL PAGE ==============

    router.get('/overview/:projectid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid);
        const search = "";
        Promise.all([showProject(projectid), usersModelbyProjectId(projectid, search)])
            .then((data) => {
                let [project, memberList] = data;
                // res.status(200).json({
                res.render('projects/overview', {
                    project,
                    memberList
                })

            })
            .catch(err => {
                console.log(err);
            })
    })


    router.get('/members/:projectid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid);
        let isSearch = false;
        const { checkId, id, checkName, name, checkRole, role } = req.query;
        let query = [];
        let search = "";
        // // const page = req.query.page || 1;
        // // const limit = 100;
        // // const offset = (page - 1) * limit;

        if (checkId && id) {
            query.push(`members.userid = ${parseInt(id)}`);
            isSearch = true;
        }
        if (checkName && name) {
            query.push(`CONCAT(users.firstname,' ',users.lastname) ILIKE '%${name}%'`);
            isSearch = true;
        }
        if (checkRole && role) {
            query.push(`members.role = '${role}'`);
            isSearch = true;
        }

        if (isSearch) {
            search += `AND ${query.join(' AND ')}`;
        }

        Promise.all([showProject(projectid), usersModelbyProjectId(projectid, search)])
            .then((data) => {
                let [project, memberList] = data;
                // res.status(200).json({
                res.render('projects/members/index', {
                    project,
                    memberList,
                    checkOptionMember
                })
            }).catch(err => {
                console.log(err);
            })
    })

    router.post('/members/:id', isLoggedIn, function (req, res) {
        const id = parseInt(req.params.id);
        const { checkId, checkName, checkPosition } = req.body;
        checkOptionMember.id = checkId;
        checkOptionMember.name = checkName;
        checkOptionMember.position = checkPosition;
        res.redirect(`/projects/members/${id}`);
    })

    router.get('/members/:id/add', isLoggedIn, (req, res) => {
        const id = parseInt(req.params.id);
        Promise.all([showMembersWithConstraint(id), showProject(id)])
            .then(data => {
                let [users, project] = data;
                res.render('projects/members/add', {
                    // res.json({
                    users,
                    project
                })
            })
            .catch(err => {
                console.log(err)
            })
    })

    router.post('/members/:id/add', isLoggedIn, (req, res) => {
        const id = parseInt(req.params.id);
        const form = req.body;
        addProjectMember(form)
            .then(() => {
                res.redirect(`/projects/members/${id}`);
            })
            .catch(err => {
                console.log(err)
            })
    })

    router.get('/members/:projectid/edit/:userid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid);
        const userid = parseInt(req.params.userid);
        Promise.all([showProject(projectid), showUser(userid, projectid)])
            .then((data) => {
                let [project, user] = data;
                res.render('projects/members/edit', {
                    // res.json({
                    project,
                    user
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.post('/members/:projectid/edit/:userid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid)
        const userid = parseInt(req.params.userid);
        const form = req.body;
        editMember(form, userid)
            .then(() => {
                res.redirect(`/projects/members/${projectid}`)
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.get('/members/:projectid/delete/:userid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid);
        const userid = parseInt(req.params.userid);
        deleteMemberById(projectid, userid)
            .then(() => {
                res.redirect(`/projects/members/${projectid}`)
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.get('/issues/:projectid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid);
        Promise.all([showProject(projectid), showIssues(projectid), showAssignee(projectid)])
            .then((data) => {
                let [project, issues, assignee] = data;
                res.render('projects/issues/index', {
                    // res.json({
                    project,
                    issues,
                    checkOptionIssue,
                    messages: req.flash('issuesMessage'),
                    moment,
                    assignee
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    // Option column 
    router.post('/issues/:projectid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid);
        let { checkId,
            checkSubject,
            checkTracker,
            checkDescription,
            checkStatus,
            checkPriority,
            checkAssignee,
            checkStartDate,
            checkDueDate,
            checkEstimateTime,
            checkSpentTime,
            checkDone,
            checkTargetVersion,
            checkAuthor,
            checkCreatedDate,
            checkUpdatedDate,
            checkClosedDate,
            checkFile
        } = req.body;

        checkOptionIssue.id = checkId;
        checkOptionIssue.subject = checkSubject;
        checkOptionIssue.tracker = checkTracker;
        checkOptionIssue.description = checkDescription;
        checkOptionIssue.status = checkStatus;
        checkOptionIssue.priority = checkPriority;
        checkOptionIssue.assignee = checkAssignee;
        checkOptionIssue.startDate = checkStartDate;
        checkOptionIssue.dueDate = checkDueDate;
        checkOptionIssue.estimateTime = checkEstimateTime;
        checkOptionIssue.spentTime = checkSpentTime;
        checkOptionIssue.done = checkDone;
        checkOptionIssue.author = checkAuthor;
        checkOptionIssue.targetVersion = checkTargetVersion;
        checkOptionIssue.createdDate = checkCreatedDate;
        checkOptionIssue.updatedDate = checkUpdatedDate;
        checkOptionIssue.closedDate = checkClosedDate;
        checkOptionIssue.file = checkFile;
        res.redirect(`/projects/issues/${projectid}`);
    })

    // render add-issue
    router.get('/issues/:projectid/add', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid);
        const search = "";
        Promise.all([usersModelbyProjectId(projectid, search), showProject(projectid)])
            .then((data) => {
                let [users, project] = data;
                res.render('projects/issues/add', {
                    // res.json({
                    users,
                    project
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.post('/issues/:projectid/add', isLoggedIn, (req, res) => {
        const authorid = req.session.user.userid;
        const projectid = parseInt(req.params.projectid);
        let form = req.body;
        if (req.files) {
            let file = req.files.file;
            let fileName = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-");
            addIssue(form, authorid, fileName)
                .then(() => {
                    file.mv(path.join(__dirname, "..", "public", "upload", fileName), function (err) {
                        if (err) return res.status(500).send(err);
                        req.flash('issuesMessage', 'New issues added successfully! File uploaded');
                        res.redirect(`/projects/issues/${projectid}`);
                    });
                })
                .catch(err => {
                    console.log(err);
                })
        } else {
            addIssue(form, authorid)
                .then(() => {
                    req.flash('issuesMessage', 'New issues added successfully!');
                    res.redirect(`/projects/issues/${projectid}`)
                })
                .catch(err => {
                    console.log(err);
                })
        }
    })

    router.get('/issues/:projectid/delete/:issueid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid);
        const issueid = parseInt(req.params.issueid);
        deleteIssue(projectid, issueid)
            .then(() => {
                req.flash('issuesMessage', 'Issue has been deleted');
                res.redirect(`/projects/issues/${projectid}`)
            })
            .catch(err => {
                console.log(err);
            })
    })

    // render edit-issue
    router.get('/issues/:projectid/edit/:issueid', (req, res) => {
        const projectid = parseInt(req.params.projectid);
        const issueid = parseInt(req.params.issueid);
        const search = "";
        Promise.all([usersModelbyProjectId(projectid, search), showProject(projectid), showIssueById(projectid, issueid), showParentIssues(projectid)])
            .then((data) => {
                let [users, project, issue, parentIssues] = data;
                showUser(issue.assignee, projectid)
                    .then((assignee) => {
                        res.render('projects/issues/edit', {
                            // res.json({
                            users,
                            project,
                            moment,
                            parentIssues,
                            issue,
                            assignee
                        })
                    })
            })
            .catch(err => {
                console.log(err);
            })
    })

    // post edit-issue
    router.post('/issues/:projectid/edit/:issueid', (req, res) => {
        const issueid = parseInt(req.params.issueid);
        const projectid = parseInt(req.params.projectid);
        let form = req.body;
        
        if (req.files) {
            let file = req.files.file;
            form.file = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-");
            updateIssue(issueid, form)
                .then(() => {
                    req.flash('issuesMessage', 'Issue updated');
                    res.redirect(`/projects/issues/${projectid}`)
                })
                .catch(err => console.log(err));
        } else {
            updateIssue(issueid, form)
                .then(() => {
                    req.flash('issuesMessage', 'Issue updated');
                    res.redirect(`/projects/issues/${projectid}`)
                })
                .catch(err => console.log(err));
        }
    })







    // Testing function related to Query-DB
    router.get('/test/:projectid/:issueid', (req, res) => {
        const projectid = parseInt(req.params.projectid);        
        const issueid = parseInt(req.params.issueid);

        showIssueById(projectid, issueid).then((data) => {
            res.json({
                data
            })
        })
    })

    return router;
}