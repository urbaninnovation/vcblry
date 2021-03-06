var listOfChallenges=[];
var currentChallenge=undefined;
function server_create_new_challenge(list,id) {currentChallenge=create_new_challenge(list,id); return currentChallenge}
function server_get_question(reverse) {let r=currentChallenge.get_question(reverse,config.mc_count); return JSON.parse(r)}
function server_check(word) {return currentChallenge.check(word)}
function server_lookup(A) {return JSON.parse(currentChallenge.lookup(A))}
function server_get_stats() {return JSON.parse(currentChallenge.get_stats())}
function server_get_challenge() {let r=currentChallenge.get_challenge(); return r}

var config = new Configuration();
function Configuration() {
	this.list = '';
	this.mc = false; // mode: multiple-choice
	this.mc_count = 3; // number of options shown with multiple-choice (min 3, max 8, default 3) (will also apply for check if mode is not mc)
	this.rrand = true; // ask in random order (own language<>foreign language)
	this.reverse = false; // always ask in reverse order (own language<>foreign language)
	this.delay_ok = 0; // delay if selected the correct answer, before switching to next question
	this.delay_error = 250; // delay if selected the wrong answer, before showing the correct answer
}

function go() {
	// get list of Challenges from API
	callAPI('GET',window.location.href+'api',{},(r)=>{parseListOfChallenges(r);start()});
	//start();
}
function callAPI(method,apicall,reqobj,callback) {
	if (!(apicall).startsWith('http')) {console.log('API-call to '+apicall+' aborted');callback();return true;}
	var t=stopwatch();
	var req = new XMLHttpRequest();
	req.onreadystatechange = function() {if (this.readyState == 4) {
		console.log(method+' '+apicall+': '+stopwatch(t)+'ms'); 
		if (this.status<500) {callback(this.responseText)} else {callback()}}
	};
	req.open(method,apicall,true);
	req.setRequestHeader("Content-Type","application/json;charset=UTF-8");
	req.send(JSON.stringify(reqobj));
}
function stopwatch(time) {if (typeof time != 'undefined') {return new Date()-time} else {return new Date()}}
function parseListOfChallenges(locJSON) {
	if (IsJsonString(locJSON)) {
		listOfChallenges=[];
		o=JSON.parse(locJSON); 
		o.forEach((i)=>{
			listOfChallenges.push(server_create_new_challenge(JSON.stringify(i.list),i.id));
			console.log(i.id,i.list);
		})
	}
}

function start(list,mc,mc_count,rrand,reverse,delay_ok,delay_error) {
	if (list!==undefined) {config.list=list} else {config.list=currentChallenge?JSON.stringify(currentChallenge.list):'Hund = dog \nKatze = cat \nMaus = mouse'}
	if (mc!==undefined) {config.mc=mc}
	if (mc_count!==undefined) {config.mc_count=mc_count}
	if (rrand!==undefined) {config.rrand=rrand}
	if (reverse!==undefined) {config.reverse=reverse}
	if (delay_ok!==undefined) {config.delay_ok=delay_ok}
	if (delay_error!==undefined) {config.delay_error=delay_error}
	let s=document.getElementById('stats');
	s.innerHTML='';
	let e=document.getElementById('main');
	let ta=document.createElement('textarea');
	let vl=document.createElement('div');
	vl.id='vl';
	ta.id='ta';
	ta.rows=10;
	ta.value=config.list;
	e.innerHTML='<div class=label><span style=font-weight:bold>VCBLRY*</span> trainer input [ <a href=# onclick=open_upload_dialog()>import</a> ]</div>';
	e.innerHTML+='<input id=import hidden type=file accept="application/json,text/plain" onchange="openFile(event,'+((v)=>{ta.value=v;updateVocabularyList();})+')">';
	let timeout=undefined;
	ta.onkeyup=function(){
		clearTimeout(timeout);
		timeout = setTimeout(function() {updateVocabularyList()}, 0);
	}
	e.appendChild(ta);
	newBUTTON(e,[],'btn','start',function(){
		config.list=ta.value;
		server_create_new_challenge(toJSON(ta.value));
		show_question();
	});
	e.appendChild(vl);
	updateVocabularyList();
}
function updateVocabularyList() {vl.innerHTML=createVocabularyList(JSON.parse(toJSON(ta.value,true)))}
function createVocabularyList(list,highlight_list) {
	// remove empty items/rows from list
	list=list.filter((i)=>{return i.A||i.B});
	return '<div class=vlHeader><span style=font-weight:bold>VCBLRY*</span> list ('+list.length+')</div>'+list.reduce(function(a,c){
		let res='';
		// check if it's a valid word-tupel
		if (c.A&&c.B) {
			// check if item is included in hightlight_list
			if (highlight_list && highlight_list.some(function (i){return ((c.A==i.A)||(c.B==i.A))})) {
				res='<div><div class=vlAh>'+c.A+'</div><div class=vlBh>'+c.B+'</div></div><div class=clear></div>';
			} else {
				res='<div><div class=vlA>'+c.A+'</div><div class=vlB>'+c.B+'</div></div><div class=clear></div>';
			}
		}
		else if (c.A) {res='<div class=vlAB>'+c.A+'</div><div class=clear></div>';}
		return a+res;
	},'<div class=vl>')+'</div>';
}
function toJSON(list,get_res_all) {
	if (IsJsonString(list)) {return list}
	let l=list.split(/\n/);
	let res=[]; // contains all valid word-tupels
	let res_all=[]; // contains all rows (including unvalid ones)
	l.forEach(function(l){
		let w=l.trim().split(/\ {2,}|\t{1,}|\||=|:/);
		if (w.length==2&&w[0]&&w[1]) {
			let o=new Object; o.A=w[0].trim(); o.B=w[1].trim();
			res.push(o);
			res_all.push(o);
		} else {
			let o=new Object; o.A=l.trim(); o.B='';
			res_all.push(o);
		};
	})
	return JSON.stringify(get_res_all?res_all:res);
}
function IsJsonString(str) {let json=undefined; try {json=JSON.parse(str)} catch (e) {return false}; return json[0]?true:false}

function openFile(event,callback) {
	let reader=new FileReader();
	reader.readAsText(event.target.files[0]);
	reader.onload=()=>{callback(reader.result)};
};
function open_upload_dialog() {document.getElementById('import').click()}

function show_stats(s) {
	if (s==undefined) {s=server_get_stats()}
	let e=document.getElementById('stats');
	e.innerHTML='';
	while (s.ok>0) {s.ok--;	e.appendChild(newDOT('ok'));}
	while (s.todo>0) {s.todo--;	e.appendChild(newDOT());}
	while (s.assist-s.error>0) {s.assist--;	e.appendChild(newDOT('assist'));}
	while (s.error>0) {s.error--; e.appendChild(newDOT('error'));}
	e.lastChild.classList.add('last');
	function newDOT(cl) {let d=document.createElement('div'); d.classList.add('dot',cl); return d;}
}

function show_question(q,is_started,is_assist) {
	let e=document.getElementById('main');
	e.innerHTML='';
	if (q==undefined) {q=server_get_question(config.reverse||(config.rrand&&Math.random()>=0.5))}
	// this is the end
	if (q.A==undefined) {show_result(); return true;}
	let btn_list=[];

	newBUTTON(e,btn_list,'wordA',q.A);
	let assist_answer=undefined;
	if (is_assist) {assist_answer = server_lookup(q.A)}
	show_stats();

	if (is_started||config.mc) {
		let i = 0;
		while (i<q.B_list.length) {
			let cl='wordB';
			if (is_assist) {
				if (assist_answer.B==q.B_list[i]) {
					newBUTTON(e,btn_list,'wordB',q.B_list[i],function(){show_question()});
				}
			} else {				
				newBUTTON(e,btn_list,cl,q.B_list[i],function(){answer(this,btn_list)},new Word(q.A,q.B_list[i]));
			}
			i++;
		}
	} else {
		newBUTTON(e,[],'optionHELP','?',function(){show_question(q,true,true)});
		newBUTTON(e,[],'optionOK','ok',function(){show_question(q,true)});
	}
}

function answer(btn,btn_list) {
	btn_list.forEach(function(b){
		b.classList='word wordB_disabled';
		b.onclick=undefined;
	});
	if (server_check(btn.answer)) {
		btn.classList='word wordB_ok';
		setTimeout(function(){show_question()},config.delay_ok);
	} else {
		btn.classList='word wordB_error';
		let l = server_lookup(btn.answer.A);
		btn_list.forEach(function(b){
			if ((b.answer.B==l.B)||(b.answer.B==l.A)) {setTimeout(function(){b.classList='word wordB';b.onclick=function(){show_question()};},config.delay_error)}
		});
	}
	show_stats();
}

function show_result() {
	let challenge = JSON.parse(server_get_challenge());
	let e=document.getElementById('main');
	let res='<div class=results>';
	//res+=challenge.list.length+' Vokabeln<br>';
	//res+='<div style=font-size:0.8rem><i>'+challenge.list[0].A+'</i> bis <i>'+challenge.list[challenge.list.length-1].A+'</i></div>';
	//if (challenge.lookups.length-challenge.wrong_answers.length>0) {res+=(challenge.lookups.length-challenge.wrong_answers.length)+' Hilfen<br>';}
	res+='<div style=font-size:3rem>'+(100-Math.round((challenge.wrong_answers.length/(challenge.list.length||1))*100))+'%</div>';
	//res+='<div style=font-size:0.8rem>'+challenge.wrong_answers.length+' Fehler</div><p>';
	res+='</div>';
	e.innerHTML=res;
	e.innerHTML+=createVocabularyList(challenge.list,challenge.lookups)+'<p>';
	newBUTTON(e,[],'btn','ok',function(){start()});
}

function newBUTTON(e,btn_list,cl,text,fnc,answer) {
	let d=document.createElement('button');
	d.classList.add('word',cl);
	d.innerHTML=text;
	d.onclick=fnc;
	d.answer=answer;
	e.appendChild(d);
	if (cl=='wordB') {btn_list.push(d)};
}
