const express = require('express');
let bodyParser = require('body-parser');
const mysql = require('mysql');
const dbOptions = require('./db_config');
const methodOverride = require('method-override');
const moment = require('moment');
const {
    connect
} = require('http2');
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");


const conn = mysql.createConnection({
    host: dbOptions.host,
    user: dbOptions.user,
    password: dbOptions.password,
    database: dbOptions.database
});

conn.connect();

if (conn) {
    console.log('mysql db에 연결됨')
} else {
    console.log('mysql 연결 실패')
}


var app = express();


var sql = {
    list: 'SELECT id, name, title, regdate fROM board ORDER BY id desc limit ?,?',
    read: 'SELECT * FROM board WHERE id=?',
    insert: 'insert into board(name,title,content,regdate,passwd) values(?,?,?,?,?)',
    delete: 'DELETE FROM board WHERE id=?',
    search_title: 'select * from board where title like ? limit ?,?',
    search_content: 'select * from board where content like ? limit ?,?',
    count: 'select count(*) as cnt from board',
    search_title_count: 'select count(*) as cnt from board where title like ?',
    search_content_count: 'select count(*) as cnt from board where content like ?'
};


app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(methodOverride('_method'));

app.get('/', (req, res) => {
    res.send('<h1>Hi Board</h1>');
})

app.get('/list', (req, res) => {
    res.redirect('/list/' + 1);
})


//1. list(소팅)
app.get('/list/:page', (req, res) => {

    let curPage = req.params.page; //현재 페이지
    let page_size = 10; //페이지의 게시물 수
    let page_list_size = 10; //페이지 갯수
    let no = 0; //limit
    let totalCount = 0; //전체 게시물 갯수

    conn.query(sql.count, (error, data) => {
        if (error) {
            console.log(error);
            return;
        }
        totalCount = data[0].cnt;

        if (totalCount < 0) {
            totalCount = 0
        }

        let totalPage = Math.ceil(totalCount / page_size); //전체 페이지
        let totalSet = Math.ceil(totalPage / page_list_size); //10개 묶음 페이지 세트 개수
        let curSet = Math.ceil(curPage / page_list_size); //현재 페이지 세트 수
        let startPage = ((curSet - 1) * 10) + 1; //시작페이지
        let endPage = (startPage + page_list_size) - 1; //마지막 페이지

        if (curPage < 0) {
            no = 0;
        } else {
            no = (curPage - 1) * 10;
        }

        page_info = {
            "curPage": curPage,
            "page_list_size": page_list_size,
            "page_size": page_size,
            "totalPage": totalPage,
            "totalSet": totalSet,
            "curSet": curSet,
            "startPage": startPage,
            "endPage": endPage
        };

        conn.query(sql.list, [no, page_size], (err, rows) => {
            if (err) {
                console.log(err);
                return;
            } else {
                res.render('list', {
                    lists: rows,
                    pasing: page_info,
                    title: 'Board List'
                })
            }
        })
    })
})

//2. 등록
app.get('/new', (req, res) => {
    res.render('new', {
        title: 'New'
    })

})

const date = moment().format('YYYY-MM-DD HH:mm:ss');
app.post('/new', (req, res) => {
    conn.query(sql.insert, [req.body.name, req.body.title, req.body.content, date, req.body.passwd], (err, rows) => {
        if (err) {
            console.log(err);
        } else {
            console.log('Inserted!!');
            res.redirect('/list');
        }
    })
})

app.get('/read/:id', (req, res) => {
    const _id = req.params.id;

    conn.query(sql.read, [_id], (err, rows) => {
        if (err) {
            console.log(err);
        } else {
            res.render('read', {
                content: rows[0],
                title: '글 읽기'
            })
        }
    })

})

//3. 삭제(REST API 사용)
app.delete('/delete/:id', (req, res) => {
    const _id = req.params.id;
    conn.query(sql.delete, [_id], (err, rows) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Deleted!!');
        res.redirect('/list');
    })
})


//4. 검색
app.post('/search/:page', (req, res) => {
    const _sel = req.body.sel;
    const _txt = req.body.txt;
    let _search_sql = "";
    let _count_sql = "";
    console.log(_sel + ',' + _txt);

    if (_sel == 'title') {
        _search_sql = sql.search_title;
        _count_sql = sql.search_title_count;
    } else if (_sel == 'content') {
        _search_sql = sql.search_content;
        _count_sql = sql.search_content_count;
    }

    let curPage = req.params.page; //현재 페이지
    let page_size = 10; //페이지의 게시물 수
    let page_list_size = 10; //페이지 갯수
    let no = 0; //limit
    let totalCount = 0; //전체 게시물 갯수

    conn.query(_count_sql, ['%' + _txt + '%'], (error, data) => {
        if (error) {
            console.log(error);
            return;
        }
        totalCount = data[0].cnt;

        if (totalCount < 0) {
            totalCount = 0
        }

        let totalPage = Math.ceil(totalCount / page_size);
        let totalSet = Math.ceil(totalPage / page_list_size);
        let curSet = Math.ceil(curPage / page_list_size);
        let startPage = ((curSet - 1) * 10) + 1;
        let endPage = (startPage + page_list_size) - 1;

        if (curPage < 0) {
            no = 0;
        } else {
            no = (curPage - 1) * 10;
        }

        page_info = {
            "curPage": curPage,
            "page_list_size": page_list_size,
            "page_size": page_size,
            "totalPage": totalPage,
            "totalSet": totalSet,
            "curSet": curSet,
            "startPage": startPage,
            "endPage": endPage
        };

        conn.query(_search_sql, ['%' + _txt + '%', no, page_size], (err, docs) => {
            if (err) {
                console.log(err);
                return;
            }
            console.log(docs);

            res.render('list', {
                title: '검색결과',
                lists: docs,
                pasing: page_info
            });
        })
    })
})

// 서버대기
app.listen(3000, () => {
    console.log('ServerRunning at localhost:3000');
})