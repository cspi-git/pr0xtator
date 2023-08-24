# Pr0xtator
API with a decent system for fresh rotating anonymous proxies, it supports HTTP (s), SOCKS4 and SOCKS5.

## Installation
Github:
```
git clone https://github.com/cspi-git/pr0xtator
```

NpmJS:
```
npm i socks-proxy-agent request-async request bottleneck mongodb url-parse express lodash
```

## Setup
Check **.env.example**

1. Make an environment file and add a variable called MONGODB_URL, there you must put your MongoDB url database.
2. In your MongoDB make a database called **core** and a collection called **pr0xtator**.
3. Make another variable below it called MONGODB_DATABASE_NAME value should be **core** and another variable called MONGODB_COLLECTION_NAME the value should be **pr0xtator**.

## Usage
To run it.
```
node index.js
```

To test specific level of proxies.
```
node test.js <level (low, medium, high)>
```

## License
MIT © CSPI