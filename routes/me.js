var express = require('express');
var router = express.Router();
var jwt    = require('jsonwebtoken');
var fs = require('fs');

var sequelize = require('../database/sequelize');
var User = require('../database/model/user').User;
var Agenda = require('../database/model/agenda').Agenda;
var database = sequelize.database;

var cert = {
    pub: fs.readFileSync('cert.pem')
}

router.use(function(req, res, next) {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, cert.pub, {algorithm: 'RS256'}, function(err, decoded) {
      if (err) {
        res.statusCode=401;
        return res.json({ success: false, message: 'Failed to authenticate token.' });
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res.status(403).send({
        success: false,
        message: 'No token provided.'
    });
  }
});

router.get('/', function(req, res, next) {
    User.findOne({
        where: {
            id: req.decoded.id,
        }
    }).then(function(user){
        res.statusCode=200;
        res.send(user);
    });
});

router.get('/agendas', function(req, res, next) {
    database.query("SELECT * FROM agendas where agendas.id IN (SELECT agenda_id FROM user_agendas where user_id=:id) ", { replacements: { id: req.decoded.id }, type: database.QueryTypes.SELECT})
      .then(function(agendas) {
        // We don't need spread here, since only the results will be returned for select queries
        res.statusCode=200;
        res.send(agendas);
      })
});

router.post('/agendas', function(req, res, next) {
    if(req.body.agenda_id){
        database.query("INSERT INTO user_agendas(created_at, updated_at, user_id, agenda_id) VALUES(NOW(), NOW(), "+req.decoded.id+", "+req.body.agenda_id+")")
          .then(function(agendas) {
            // We don't need spread here, since only the results will be returned for select queries
            if(agendas){
                res.statusCode=200;
                res.send(agendas);
            }
            else{
                res.statusCode=401;
                res.send("This Agenda does not exist");
            }

        });
    }
    else{
        res.statusCode=403;
        res.send("Please provide an Agenda id");
    }

});




module.exports = router;
