# Potato Monitor Back

**Base**
- [Description](#description)
- [Packages](#packages)
- [Documentation](#documentation)

**Running the Project**
- [Server](#server)

**Code**
- [Folder Structure](#folder-structure)

***

## Base

### Description

- Node.js app with Express.js. Contains two parts:
    - app (endpoints and sockets)
    - routines (blocks and data handling)

### Packages

Pay attention on:
- config.js (https://www.npmjs.com/package/config)
- express (https://www.npmjs.com/package/express)
- socket.io (https://www.npmjs.com/package/socket.io)
- pcjs (https://www.npmjs.com/package/pcjs)
- mongoose (https://www.npmjs.com/package/mongoose)
- budsnag (https://www.npmjs.com/package/bugsnag)

_See `package.json` file._


### Documentation

- this `README` file
- source code
- API
    - metric
        - /appmetrics-dash/ - display Node.js application data as a html web application.
        https://github.com/RuntimeTools/appmetrics-dash
    - v1
        - API_PREFIX/table/ - returns current state of the producers table.
        - API_PREFIX/blocks/:number/ - returns info about the block.
        - API_PREFIX/accounts/:name/ - returns info about the account
        - API_PREFIX/accounts/:name/history?skip=0&limit=10
        - API_PREFIX/transactions?actions=voteproducer,issue&mentionedAccounts=cryptolions1,bitfinexeos1&tsStart=1533658816000&tsEnd=1534758816000 returns list of transactions
        Where: actions - list of actions what you need separated by comma, mentionedAccounts - list of accounts what you need separated by comma, tsStart - timestamp (in ms) from you need transactions, tsEnd - timestamp (in ms) by you need transactions.
        Limit is equals 100
        - API_PREFIX/transactions/:txid/ returns transactions by transaction id
        - API_PREFIX/p2p/:type/ if type === endpoints returns p2p endpoints, if type === server returns p2p server addres

- socket
    - usersonline - returns the number of users, which using app now
    - table - returns rows that were updated from the last event to now
    - totalstaked - returns total stacked value
    - reload_producers - an event that called when producers positions were changed
    - transactions - returns last part of transactions what were generated from the last event to now
    - info - returns general info
    - blockupdate - returns main info about current block



***

## Running the Project

### server
- check config folder => default.json / create another config file for special env
- configure main configs for you:
    - SERVER (set HOST and PORT)
    - NODE (HOST and PORT) strongly recommend select node with a minimum ping for you
    - MONGODB (settings of your mongodb)
    - BUGSNAG_API_KEY (create and config your bugsnag app before)
    - WHITE_LIST (list with domains, that will be able to appeal to your API
- look through other configs
- install pm2 module if you prefer running with pm2 (npm i -g pm2)
- start the backend app:
    - with pm2 (pm2 start ecosystem.config.js)
    - with docker (docker build -t "appName" . => docker run "appName")
    - from console (npm start)

***

## Code

### Folder structure

```
├─ config                         # config json files
├─ src                              # source files.
│  ├─ db                           # data base files.
│  │  ├─ schema               # mongoose schemas.
│  ├─ endpoints                # API endpoints.
│  │  ├─ api.v1                   # API endpoints, version 1
│  │  ├─ commands            # commands endpoints
│  ├─ handlers                   # handlers for hendling realtime data
│  ├─ helpers                     # App helpers.
│  ├─ migrations                 # db migrations scripts
│  ├─ routines                     # routine work
│  │  ├─ cleanTran...           # clean TransactionsLastHourCollection every 15 minutes from old data (created more than one hour again)
│  │  ├─ handleBlock           # handle blocks (insert transactions, update/insert accounts, update producers)
│  │  ├─ updateProducers   # update producers data (bp json).
│  ├─ socket                        # socket events.
│  ├─ utils                            # utils
```





