const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const FormData = require('form-data')
const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

// CONFIG VARIABLES - TO CHANGE IN CASE WHATSAPP DECIDES TO CHANGE CLASSES NAMES
const search_box_class='._1awRl';
const chat_list_class = '.3dHYI';

/*
* How does this work?
* When registering a user should send a message to our whatsapp
* The user's number is saved in the contacts and we will therefore have a prev. conversation with him/her
* The service should do a polling to the server that builds a queue of notifications
* The notification queue is consumed by type and recipient
* If the queue is empty the service will continue polling at a lower rate. 
*
*/
(async function main(){
    try {
        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();
        await page.setUserAgent(
            "User Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
        );
        console.log('navigating...');
        await page.goto('https://web.whatsapp.com/');
        await page.waitForSelector('._1awRl ', {timeout: 1000000});
        console.log('whatsapp loaded');
        var recursiveFetch = async function () {
            var data = await fetch("http://www.noorriyadh.xyz/xhr/list-notifications?token=91286asjfb9q734f9rr7134tfo2f").then(response => {
                            return response.json()
                }).then(async function (json) {
                    contacts = JSON.parse(json);
                    console.log('fetching the value...')
                    if (contacts.length > 0) {
                        for (c of contacts) {
                            console.log('searching for the contact');
                            await page.$('._3Eocp').then((erase)=>erase.click()).catch((error)=> console.log('nothing to erase...'));
                            const search = await page.$('._1awRl');
                            await search.click();
                            console.log('pasting contact...');
                            console.log(c.fields.number);
                            let number = c.fields.number.toString();
                            if (number.startsWith('0')) {
                                number = number.slice(1,number.length);
                            }
                            await page.keyboard.type(number);
                            console.log('Looking for chats...');
                            await page.waitForFunction('document.querySelector("body").innerText.includes("No chats")', {timeout: 5000})
                            .then(() => {
                                console.log(
                                    "no contacts found..."
                                );
                                var code = 404;
                                var response = fetch(`http://www.noorriyadh.xyz/xhr/consume-notification?token=91286asjfb9q734f9rr7134tfo2f&wp_pk=${c.pk}&code=${code}`).then(response => {
                                    return response.json()
                                }).then(res => {
                                    console.log('message popped from the queue with status: ' + code);
                                }).catch(error=> {
                                    console.error(error);
                                });
                            })
                            .catch(async (error) => {
                                console.log('we have contacts matching search criteria: timeout');
                                console.log('taking first contact found...');
                                setTimeout(()=> {console.log('..waited some milliseconds'), 1000});
                                await page.keyboard.press('Tab');
                                setTimeout(()=> {console.log('..waited some milliseconds'), 1000});
                                await page.keyboard.press('Enter');
                                setTimeout(()=> {console.log('..waited some milliseconds'), 1000});
                                console.log('pasting message...');
                                await page.keyboard.press('Backspace');
                                await page.keyboard.type(c.fields.message, {delay: 10});
                                await page.keyboard.press('Enter');
                                var code = 200;
                                var response = fetch(`http://www.noorriyadh.xyz/xhr/consume-notification?token=91286asjfb9q734f9rr7134tfo2f&wp_pk=${c.pk}&code=${code}`).then(response => {
                                    return response.json();
                                }).then(res => {
                                    console.log('message popped from the queue with status: ' + code);
                                }).catch(error=> {
                                    console.error(error);
                                });
                            });
                        }
                    } else {
                        console.log('No notifications to send. Going to sleep...')
                    }
                    setTimeout(recursiveFetch, 30000);
                }).catch(error => {
                    if (error.code == "ECONNREFUSED") {
                        console.error('server not available retrying in a minute');
                       
                    } else {
                        console.error(error);
                    }
                    setTimeout(recursiveFetch, 60000);
                });
        } 

        recursiveFetch();
        
    } catch(error) {
        console.log(error)
    }
})();