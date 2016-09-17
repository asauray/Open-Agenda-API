var express = require('express');
var router = express.Router();

var sequelize = require('../database/sequelize');
var Agenda = require('../database/model/agenda').Agenda;
var AgendaEvent = require('../database/model/agenda').AgendaEvent;
var AgendaType = require('../database/model/agenda_type').AgendaType;
var database = sequelize.database;

const MIN_WEEK=0;
const MAX_WEEK=35;

const MIN_DAY=0;
const MAX_DAY=31;

/* GET users listing. */

// type:
// university
// lifestyle
router.get('/', function(req, res, next) {
    if(req.query.type){
        if(req.query.entity){
            Agenda.findAll({
                where: {
                    agenda_type_id: req.query.type,
                    agenda_entity_id: req.query.entity
                }
            }).then(function(agendas){
                res.statusCode=200;
                res.send(agendas);
            });
        }
        else{
            Agenda.findAll({
                where: {
                    agenda_type_id: req.query.type
                }
            }).then(function(agendas){
                res.statusCode=200;
                res.send(agendas);
            });
        }
    }
    else{
        Agenda.findAll().then(function(agendas){
            res.statusCode=200;
            res.send(agendas);
        });
    }
});

router.get('/:id', function(req, res, next) {
    if(req.params.id == null){
        res.statusCode=404;
        return res.send('Error 404: No agenda found');
    }
    Agenda.findOne({
        where: {
            id: req.params.id
        }
    }).then(function(agenda){
        if(agenda){
            res.statusCode=200;
             res.send(agenda);
        }
        else{
            res.statusCode=200;
            res.json({});
        }
    });
});

// wi stands for week identifier. Here we consider the number in the calendar.
router.get('/:id/:date', function(req, res, next) {
    if(req.params.id == null || req.params.date == null){
        res.statusCode=404;
        return res.json({});
    }
    AgendaEvent.findAll({
        where: {
            agenda_id: req.params.id,
            date: req.params.date
        }
    }).then(function(events){
        if(events){
            res.statusCode=200;
            res.send(events);
        }
        else{
            res.statusCode=200;
            res.json({});
        }
    });
});

// wi stands for week identifier. Here we consider the number in the calendar.
// di stands for day identifier. Here we consider the number the the provided week.
// 0 is for Monday. 6 is for Sunday.
router.get('/:id/:start_date/:end_date', function(req, res, next) {
    if(req.params.id && req.params.start_date && req.params.end_date){
        AgendaEvent.findAll({
            where: {
                date:{
                    $lte: req.params.end_date,
                    $gte: req.params.start_date
                },
                agenda_id: req.params.id,
            }
        }).then(function(events){
            if(events){
                res.statusCode=200;
                res.send(events);
            }
            else{
                res.statusCode=200;
                res.json({});
            }
        });
    }
    else{
        res.statusCode=404;
        return res.json({});
    }

});
module.exports = router;
