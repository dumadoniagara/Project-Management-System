var express = require('express');
var router = express.Router();
var moment = require('moment');
const path = require('path');
const Project = require('../models/projects')
const Users = require('../models/users');
const { static } = require('express');

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

manipulateActivity = (activity) => {
    activity.forEach(item => {
        item.dateactivity = moment(item.dateactivity).format('YYYY-MM-DD');
        item.timeactivity = moment(item.timeactivity, 'HH:mm:ss.SSS').format('HH:mm:ss');
        item.description = item.description.split('/').map(item => {
            return item.split('-');
        })
        item.spent = item.description[0];
        item.done = item.description[1];
    })
    let allDate = activity.map(value => value.dateactivity);
    let uniqueDate = allDate.filter((value, index) => allDate.indexOf(value) == index);
    return uniqueDate.map(date => {
        return {
            date, data: activity.filter((value) => value.dateactivity == date)
        }
    })
}

module.exports = (db) => {

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



    function updateIssue(issueid, form) {
        return new Promise((resolve, reject) => {
            let closeddate = false;
            if (form.status == 'closed') {
                closeddate = true;
            }
            if (form.file) {
                let sqlInsert = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assignee = $5, duedate = $6, done = $7, parenttask = $8, spenttime = $9, targetversion = $10,  files = $11, updateddate = $12${closeddate ? `, closeddate = NOW() ` : " "}WHERE issueid = $13`
                db.query(sqlInsert, [form.subject, form.description, form.status, form.priority, parseInt(form.assignee), form.dueDate, parseInt(form.done), form.parentTask, parseInt(form.spentTime), form.targetVersion, form.file, 'NOW()', issueid], (err) => {
                    resolve();
                    reject(err);
                })
            } else {
                let sqlInsert = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assignee = $5, duedate = $6, done = $7, parenttask = $8, spenttime = $9, targetversion = $10, updateddate = $11${closeddate ? `, closeddate = NOW() ` : " "}WHERE issueid = $12`
                db.query(sqlInsert, [form.subject, form.description, form.status, form.priority, parseInt(form.assignee), form.dueDate, parseInt(form.done), form.parentTask, parseInt(form.spentTime), form.targetVersion, 'NOW()', issueid], (err) => {
                    resolve();
                    reject(err);
                })
            }
        })
    }

    recordActivity = (form, issueid, authorid, projectid) => {
        return new Promise((resolve, reject) => {
            let sql = `INSERT INTO activity (title, description, author, projectid, time) VALUES($1, $2, $3, $4, NOW())`;
            let title = `${form.subject} #${issueid} (${form.tracker}) - [${form.status}]`;
            let spentString = `${form.oldSpent}-${form.spentTime}`;
            let doneString = `${form.oldDone}-${form.done}`;
            let description = `${spentString}/${doneString}`;
            db.query(sql, [title, description, authorid, projectid], err => {
                resolve();
                reject(err);
            })
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




    // ================================== ROUTES ================================
    router.get('/', isLoggedIn, function (req, res, next) {
        const { checkId, id, checkName, name, checkMember, memberId } = req.query;
        const link = 'projects';
        let isSearch = false;
        let query = [];
        let search = "";
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        const url = req.url == '/' ? `/?page=1` : req.url;

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
        Promise.all([Users.usersModel(db), Project.projectsModel(search, limit, offset, db), Project.pageModel(search, db)])
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
                    url,
                    link,
                    login: req.session.user
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
        res.redirect('/projects');
    })

    router.get('/add', isLoggedIn, (req, res) => {
        const link = 'projects';
        Users.usersModel(db)
            .then((memberList) => {
                res.render('projects/add', {
                    memberList,
                    link,
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err)
            })
    })

    router.post('/add', isLoggedIn, (req, res) => {
        let form = req.body;
        Project.addProject(form, db)
            .then(() => {
                Project.addMembers(form, db)
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
        Promise.all([Project.deleteProject(id, db)])
            .then(() => {
                console.log('joss')
                res.redirect('/projects');
            })
            .catch((err) => {
                console.log(err);
            })
    })

    router.get('/edit/:id', isLoggedIn, (req, res) => {
        const link = 'projects';
        const id = parseInt(req.params.id);
        Promise.all([Users.usersModel(db), Project.showMembers(id, db), Project.showProject(id, db)])
            .then((data) => {
                let [memberList, memberProject, project] = data;
                let membersId = [];
                memberProject.forEach(item => {
                    membersId.push(item.userid);
                })

                res.render('projects/edit', {
                    memberList,
                    membersId,
                    project,
                    link,
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.post('/edit', isLoggedIn, (req, res) => {
        let form = req.body;
        Promise.all([Project.updateProjectName(form, db), Project.deleteMember(form, db)])
            .then(() => {
                Project.updateProjectMember(form, db)
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


    // ========================== ROUTES PROJECT DETAIL =================================

    router.get('/overview/:projectid', isLoggedIn, (req, res) => {
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        const search = "";
        Promise.all([Project.showProject(projectid, db), Project.usersModelbyProjectId(projectid, search, 'ALL', 0, db), Project.countTracker(projectid, db)])
            .then((data) => {
                let [project, memberList, tracker] = data;
                res.render('projects/overview', {
                    project,
                    memberList,
                    link,
                    tracker,
                    projectid,
                    projectPath: 'overview',
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.get('/members/:projectid', isLoggedIn, (req, res) => {
        const url = req.url == `/members/${req.params.projectid}` ? `/members/${req.params.projectid}/?page=1` : req.url;
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        let isSearch = false;
        const { checkId, id, checkName, name, checkRole, role } = req.query;
        let query = [];
        let search = "";

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

        Promise.all([Project.showProject(projectid, db), Project.usersModelbyProjectId(projectid, search, 3, offset, db), Project.countPage('users.userid', 'members LEFT JOIN users ON members.userid = users.userid', projectid, search, db)])
            .then((data) => {
                let [project, memberList, totalMembers] = data;
                let pages = Math.ceil(totalMembers / limit);
                res.render('projects/members/index', {
                    project,
                    memberList,
                    checkOptionMember,
                    link,
                    page,
                    url,
                    pages,
                    projectPath: 'members',
                    login: req.session.user
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
        const link = 'projects';
        const id = parseInt(req.params.id);
        Promise.all([Project.showMembersWithConstraint(id, db), Project.showProject(id, db)])
            .then(data => {
                let [users, project] = data;
                res.render('projects/members/add', {
                    users,
                    project,
                    link,
                    projectPath: 'members',
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err)
            })
    })

    router.post('/members/:id/add', isLoggedIn, (req, res) => {
        const id = parseInt(req.params.id);
        const form = req.body;
        Project.addProjectMember(form, db)
            .then(() => {
                res.redirect(`/projects/members/${id}`);
            })
            .catch(err => {
                console.log(err)
            })
    })

    router.get('/members/:projectid/edit/:userid', isLoggedIn, (req, res) => {
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        const userid = parseInt(req.params.userid);
        Promise.all([Project.showProject(projectid, db), Project.showUser(userid, projectid, db)])
            .then((data) => {
                let [project, user] = data;
                res.render('projects/members/edit', {
                    project,
                    user,
                    link,
                    projectPath: 'members',
                    login: req.session.user
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
        Project.editMember(form, userid, db)
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
        Project.deleteMemberById(projectid, userid, db)
            .then(() => {
                res.redirect(`/projects/members/${projectid}`)
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.get('/issues/:projectid', isLoggedIn, (req, res) => {
        const link = 'projects';
        const url = req.url == `/issues/${req.params.projectid}` ? `/issues/${req.params.projectid}/?page=1` : req.url;
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        const projectid = parseInt(req.params.projectid);

        let isSearch = false;
        const { checkId, id, checkSubject, subject, checkTracker, tracker } = req.query;
        let query = [];
        let search = "";

        if (checkId && id) {
            query.push(`issues.issueid = ${parseInt(id)}`);
            isSearch = true;
        }
        if (checkSubject && subject) {
            query.push(`issues.subject ILIKE '%${subject}%'`);
            isSearch = true;
        }
        if (checkTracker && tracker) {
            query.push(`issues.tracker = '${tracker}'`);
            isSearch = true;
        }

        if (isSearch) {
            search += `AND ${query.join(' AND ')}`;
        }

        Promise.all([Project.showProject(projectid, db), Project.showIssues(projectid, search, limit, offset, db), Project.showAssignee(projectid, db), Project.countPage('issueid', 'issues', projectid, search, db)])
            .then((data) => {
                let [project, issues, assignee, total] = data;
                const pages = Math.ceil(total / limit)
                res.render('projects/issues/index', {
                    // res.json({
                    project,
                    issues,
                    checkOptionIssue,
                    messages: req.flash('issuesMessage'),
                    moment,
                    assignee,
                    url,
                    pages,
                    page,
                    link,
                    projectPath: 'issues',
                    login: req.session.user
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
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        const search = "";
        Promise.all([Project.usersModelbyProjectId(projectid, search, 'ALL', 0, db), Project.showProject(projectid, db)])
            .then((data) => {
                let [users, project] = data;
                res.render('projects/issues/add', {
                    users,
                    project,
                    link,
                    projectPath: 'issues',
                    login: req.session.user
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
            Project.addIssue(form, authorid, fileName, db)
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
            Project.addIssue(form, authorid, db)
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
    router.get('/issues/:projectid/edit/:issueid', isLoggedIn, (req, res) => {
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        const issueid = parseInt(req.params.issueid);
        const authorid = req.session.userid;
        const search = "";
        Promise.all([Project.usersModelbyProjectId(projectid, search, 'ALL', 0, db), showProject(projectid), showIssueById(projectid, issueid), showParentIssues(projectid)])
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
                            assignee,
                            link,
                            projectPath: 'issues',
                            login: req.session.user
                        })
                    })
            })
            .catch(err => {
                console.log(err);
            })
    })


    // post edit-issue
    router.post('/issues/:projectid/edit/:issueid', isLoggedIn, (req, res) => {
        const issueid = parseInt(req.params.issueid);
        const projectid = parseInt(req.params.projectid);
        const authorid = req.session.user.userid;
        let form = req.body;
        if (req.files) {
            let file = req.files.file;
            form.file = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-");
            Promise.all([recordActivity(form, issueid, authorid, projectid), updateIssue(issueid, form)])
                .then(() => {
                    file.mv(path.join(__dirname, "..", "public", "upload", form.file), function (err) {
                        if (err) return res.status(500).send(err);
                        req.flash('issuesMessage', 'Issue updated');
                        res.redirect(`/projects/issues/${projectid}`)
                    })
                })
                .catch(err => console.log(err));
        } else {
            Promise.all([recordActivity(form, issueid, authorid, projectid), updateIssue(issueid, form)])
                .then(() => {
                    req.flash('issuesMessage', 'Issue updated');
                    res.redirect(`/projects/issues/${projectid}`)
                })
                .catch(err => console.log(err));
        }
    })

    router.get('/activity/:projectid', isLoggedIn, (req, res) => {
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        Promise.all([Project.showProject(projectid), Project.showActivity(projectid)])
            .then((data) => {
                let [project, rawActivity] = data;
                let activity = manipulateActivity(rawActivity);
                activity.forEach(item => {
                    if (item.date == moment().format('YYYY-MM-DD')) {
                        item.date = 'Today';
                    } else if (item.date == moment().subtract(1, 'days').format('YYYY-MM-DD')) {
                        item.date = 'Yesterday';
                    } else {
                        item.date = moment(item.date).format("MMMM Do, YYYY")
                    }

                })

                res.render('projects/activity/index', {
                    project,
                    moment,
                    activity,
                    link,
                    projectPath: 'activity',
                    login: req.session.user
                })
            })

    })


    return router;
}