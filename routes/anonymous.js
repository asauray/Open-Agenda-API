var express = require('express');
var router = express.Router();
var jwt    = require('jsonwebtoken');
var fs = require('fs');
var query = require('../edt-query/query');

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
    if(req.decoded.id){
        query.GET.user_anonymous(req.decoded.id, res);
    }
    else{
        res.status(403).json({message: "Who are you?"});
    }
});

router.post('/', function(req, res, next){
    var ip_addr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    var id = req.body.id;
    var secret = req.body.secret;
    if(id&&secret){
        query.POST.anonymous_user_secret(id, secret, res);
    }
    else if(ip_addr){
        query.anonymous_ip_addr(ip_addr, function(anonymous_user){
            console.log("user: "+anonymous_user);
            if(anonymous_user.length!=0){
                res.statusCode=403;
                res.send();
            }
            else{
                query.POST.anonymous_user(ip_addr, res);
            }
        });
    }
    else{
        res.statusCode=403;
        res.json({message: 'We could not get your ip address.'});
    }
});

router.get('/events', function(req, res, next) {
    query.GET.events_anonymous(req.decoded.id, req.query.start_date, req.query.end_date, res);
});

router.get('/agendas', function(req, res, next) {
    query.GET.user_agendas_anonymous(req.decoded.id, res);
});

router.post('/agendas', function(req, res, next) {
    if(req.body.provider && req.body.agenda_id){
        query.POST.agendas_anonymous(req.body.provider, req.body.agenda_id, req.decoded.id, res);
    }
    else{
        res.statusCode=400;
        res.send("This Agenda does not exist");
    }
});

router.delete('/agendas/:id', function(req, res, next) {
    if(req.params.id && req.query.provider){
        query.DELETE.agenda_anonymous(req.query.provider, req.params.id, req.decoded.id, res);
    }
    else{
        res.statusCode=400;
        res.send("No Agenda provided");
    }
});

module.exports = router;