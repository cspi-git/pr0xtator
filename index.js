(async()=>{
    "use strict";

    require("dotenv").config()

    // Dependencies
    const { SocksProxyAgent } = require("socks-proxy-agent")
    const proxiesModule = require("./modules/proxies")
    const { MongoClient } = require("mongodb")
    const bottleneck = require("bottleneck")
    const urlParse = require("url-parse")
    const request = require("request")
    const express = require("express")
    const _ = require("lodash")
    
    // Variables
    const web = express()
    const port = process.env.PORT || 758
    const threads = new bottleneck.default({ maxConcurrent: 200 })
    const threads2 = new bottleneck.default()

    const client = new MongoClient(process.env.MONGODB_URL)
    const database = client.db(process.env.MONGODB_DATABASE_NAME)
    const savedProxies = database.collection(process.env.MONGODB_COLLECTION_NAME)

    var proxies = await proxiesModule(_, require("request-async"))
    var sProxies = []
    var wProxies = []

    // Function
    async function save(){
        console.log("Exiting...")

        try{
            await savedProxies.insertMany(proxies.http.map((proxy)=>{
                return { type: "http", full: proxy }
            }), { ordered: false })

            await savedProxies.insertMany(proxies.socks4.map((proxy)=>{
                return { type: "http", full: proxy }
            }), { ordered: false })

            await savedProxies.insertMany(proxies.socks5.map((proxy)=>{
                return { type: "http", full: proxy }
            }), { ordered: false })
        }catch{}

        process.exit()
    }

    async function checkOnce(proxy){
        const host = proxy.full
        var obj = { timeout: 3000 }
        
        if(host.match("socks")){
            const agent = new SocksProxyAgent(host)
            obj.agent = agent
        }else{
            obj.proxy = host
        }

        request("https://api.ipify.org/", obj, (err)=>{
            if(!err){
                if(!_.find(wProxies, { full: host })){
                    const parsed = urlParse(host)

                    wProxies.push({
                        type: proxy.type,
                        full: host.replace("\r", ""),
                        host: parsed.host,
                        port: +host.match(/:\d+/)[0].replace(":", ""),
                        score: 1
                    })
                }else{
                    wProxies[_.findIndex(wProxies, { full: host })].score++
                }
            }else{
                const exists = _.find(wProxies, { full: host })

                if(exists){
                    if(exists.score === 1){
                        delete wProxies[_.findIndex(wProxies, { full: host })]
                        wProxies = wProxies.filter((proxy)=>proxy)
                    }else{
                        wProxies[_.findIndex(wProxies, { full: host })].score--
                    }
                }
            }
        })
    }

    async function check(proxy){
        const host = proxy.full
        var obj = { timeout: 3000 }
        
        if(host.match("socks")){
            const agent = new SocksProxyAgent(host)
            obj.agent = agent
        }else{
            obj.proxy = host
        }

        request("https://api.ipify.org/", obj, (err)=>{
            if(!err){
                if(!_.find(wProxies, { full: host })){
                    const parsed = urlParse(host)

                    wProxies.push({
                        type: proxy.type,
                        full: host.replace("\r", ""),
                        host: parsed.host,
                        port: +host.match(/:\d+/)[0].replace(":", ""),
                        score: 1
                    })

                    threads2.schedule(checkOnce, proxy)
                }else{
                    wProxies[_.findIndex(wProxies, { full: host })].score++
                }
            }else{
                const exists = _.find(wProxies, { full: host })

                if(exists){
                    if(exists.score === 1){
                        delete wProxies[_.findIndex(wProxies, { full: host })]
                        wProxies = wProxies.filter((proxy)=>proxy)
                    }else{
                        wProxies[_.findIndex(wProxies, { full: host })].score--
                    }
                }
            }
        })
    }

    async function start(){
        console.log("Checking for any saved proxies.")
        sProxies = await savedProxies.find({}, { projection: { id: 0 } }).toArray()

        if(sProxies.length){
            console.log(`${sProxies.length} saved proxies found.`)
            for( const proxy of sProxies ) threads.schedule(check, proxy)
        }else{
            console.log("No saved proxies found.")
        }

        console.log("Filtering new proxies.")
        proxies.http = proxies.http.filter((proxy)=>!_.find(sProxies, { full: proxy }))
        proxies.socks4 = proxies.socks4.filter((proxy)=>!_.find(sProxies, { full: proxy }))
        proxies.socks5 = proxies.socks5.filter((proxy)=>!_.find(sProxies, { full: proxy }))

        console.log("Checking the proxies.")
        for( const proxy of proxies.http ) threads.schedule(check, { type: "http", full: proxy })
        for( const proxy of proxies.socks4 ) threads.schedule(check, { type: "socks4", full: proxy })
        for( const proxy of proxies.socks5 ) threads.schedule(check, {  type: "socks5", full: proxy })

        // Clear bad score proxies
        setInterval(()=>{
            console.log("Filtering proxies with bad score.")
            for( const proxy in wProxies ) if(wProxies[proxy].score < 2) delete wProxies[proxy]
            wProxies = wProxies.filter((proxy)=>proxy)
        }, 60 * 1000) // 1 Minute

        // Double check working proxies
        setInterval(()=>{console.log("Double checking the current proxies."); for( const proxy of wProxies ) threads2.schedule(check, proxy)}, 5000)

//         setInterval(()=>{
//             console.log(`Working Proxies: ${wProxies.length}
// Working High Proxies: ${wProxies.filter((proxy)=>proxy.score > 7).length}
// Working Medium Proxies: ${wProxies.filter((proxy)=>proxy.score > 1 && 7 > proxy.score).length}
// Working Proxies Checking Workers: ${thread2.jobs().length}
// Proxies Checking Workers: ${thread.jobs().length}`)
//         }, 2000)

        setInterval(()=>{
            for( const proxy of proxies.http ) threads.schedule(check, { type: "http", full: proxy })
            for( const proxy of proxies.socks4 ) threads.schedule(check, { type: "socks4", full: proxy })
            for( const proxy of proxies.socks5 ) threads.schedule(check, {  type: "socks5", full: proxy })
        }, 3 * 60 * 1000) // 3 Minutes
    }
    
    // Main
    console.log("Connecting to the database.")
    await client.connect()
    console.log("Successfully connected to the database.")

    web.get("/", (req, res)=>{res.send("Home.")})
    web.get("/api/getProxy", (req, res)=>{
        const level = req.query.level || "low"

        if(!wProxies.length) return res.json({
            status: "failed",
            message: "Currently there are no working proxies."
        })

        var randomProxy;

        if(level === "high"){
            const highProxies = wProxies.filter((proxy)=>proxy.score > 7)

            if(!highProxies.length) return res.json({
                status: "failed",
                message: "Currently there are no high proxies."
            })
    
            randomProxy = highProxies[Math.floor(Math.random() * highProxies.length)]
        }else if(level === "medium"){
            const mediumProxies = wProxies.filter((proxy)=>proxy.score > 1 && 7 > proxy.score)

            if(!mediumProxies.length) return res.json({
                status: "failed",
                message: "Currently there are no medium proxies."
            })
    
            randomProxy = mediumProxies[Math.floor(Math.random() * mediumProxies.length)]
        }else if(level === "low"){
            randomProxy = wProxies[Math.floor(Math.random() * wProxies.length)]
        }else{
            return res.json({
                status: "failed",
                message: "Invalid level query."
            })
        }

        threads.schedule(check, randomProxy)
        res.send(randomProxy)
    })

    web.get("/api/status", (req, res)=>{
        res.json({
            status: "success",
            data: {
                vwpfn: wProxies.length, // Verified working proxies for now.
                workers: thread.counts()
            }
        })
    })

    web.use("*", (req, res)=>res.redirect("/"))
    web.listen(port, ()=>{
        console.log(`Server is running. Port: ${port}`)
        start()
    })

    process.on("exit", ()=>save())
    process.on("beforeExit", ()=>save())
    process.on("SIGINT", ()=>save())
})()

process.on("uncaughtException", ()=>{})
process.on("unhandledRejection", ()=>{})