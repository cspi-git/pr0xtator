(async()=>{
    "use strict";

    // Dependencies
    const { SocksProxyAgent } = require("socks-proxy-agent")
    const request = require("request-async")

    // Variables
    const args = process.argv.slice(2)

    // Functions
    async function check(proxy){
        const host = proxy.full
        const ID = Math.floor(Math.random() * 99999)
        console.time(`[ID:${ID}] ${host} requesting speed`)

        var obj = {}
        
        if(host.match("socks")){
            const agent = new SocksProxyAgent(host)
            obj.agent = agent
        }else{
            obj.proxy = host
        }

        const randomNumbers = Math.floor(Math.random() * 999999)
        console.time(`Success${randomNumbers}`)
        const response = await request("https://api.ipify.org/", {headers: obj})

        console.log(`Response: ${response.body}`)
        console.timeEnd(`Success${randomNumbers}`)
    }
    
    // Main
    console.log(`Pr0xtator - API with a decent system for fresh rotating anonymous proxies, it supports HTTP (s), SOCKS4 and SOCKS5.
PRIVATE TOOL FOR CSPI ONLY BY I2RYS (NOT ANYMORE XD)
    `)
    if(!args.length) return console.log("usage: node index.js <level (low, medium, high)>")

    console.log(`==================== Testing ${args[0]} level proxies ====================`)
    for( let i = 0; i <= 4; i++ ){
        var response = await request(`http://localhost:758/api/getProxy?level=${args[0]}`)
        response = JSON.parse(response.body)

        console.log(`[${i}] Received proxy: ${response.host}`)
        check(response)
    }
})()