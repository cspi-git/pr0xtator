"use strict";

// Main
module.exports = function(_, request){
    var proxies = {
        http: [],
        socks4: [],
        socks5: []
    }

    return new Promise(async(resolve)=>{
        var response = await request("https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=elite")
        for( const proxy of response.body.split("\n") ) proxies.http.push(`http://${proxy}`)
        response = await request("https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=anonymous")
        for( const proxy of response.body.split("\n") ) proxies.http.push(`http://${proxy}`)
        response = await request("https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=10000&country=all&ssl=all&anonymity=elite")
        for( const proxy of response.body.split("\n") ) proxies.socks4.push(`socks://${proxy}`)
        response = await request("https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all&ssl=all&anonymity=elite")
        for( const proxy of response.body.split("\n") ) proxies.socks5.push(`socks://${proxy}`)

        proxies.http = _.uniq(proxies.http)
        proxies.socks4 = _.uniq(proxies.socks4)
        proxies.socks5 = _.uniq(proxies.socks5)

        resolve(proxies)
    })
}