var express = require('express');
var router = express.Router();

var sequelize = require('../database/sequelize');
var Entity = require('../database/model/entity').Entity;
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
    Entity.findAll().then(function(agendas){
        res.send(agendas);
    });
});

router.get('/:type', function(req, res, next){
    if(req.params.type){
        Entity.findAll({
            where: {
                agenda_type_id: req.params.type
            }
        }).then(function(agendas){
            res.statusCode=200;
            res.send(agendas);
        });
    }
    else{
        res.statusCode=400;
        res.json({});
    }

});

module.exports = router;