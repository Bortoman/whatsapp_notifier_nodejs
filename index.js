const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

// CONFIG VARIABLES - TO CHANGE IN CASE WHATSAPP DECIDES TO CHANGE CLASSES NAMES
const search_box_class='._1awRl';
const search_box_number_input_class='._3Eocp'

/*
* How does this work?
* The user's number is saved in the contacts therefore we will be able to start a conversation with him/her
* The service should do a polling to the server that builds a queue of notifications
* The notification queue is consumed by type and recipient
* If the queue is empty the service will continue polling at a lower rate. 
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
        await page.waitForSelector(search_box_class, {timeout: 1000000});
        console.log('whatsapp loaded');
        var recursiveFetch = async function () {
            fetch("http://mydomain.com/list-notifications").then(response => {
                    return response.json()
                }).then(async function (json) {
                    notifications = JSON.parse(json);
                    console.log('fetching the value...')
                    if (notifications.length > 0) {
                        for (notification of notifications) {
                            console.log('searching for the contact');
                            await page.$(search_box_number_input_class).then((erase)=>erase.click()).catch((error)=> console.log('nothing to erase...'));
                            const search = await page.$(search_box_class);
                            await search.click();
                            console.log('pasting contact...');
                            let number = notification.fields.number.toString();
                            // in some countries people is used to save their number starting with 0, this is not saved in whatsapp so we will remove it
                            if (number.startsWith('0')) {
                                number = number.slice(1,number.length);
                            }
                            await page.keyboard.type(number);
                            console.log('Looking for chats...');
                            await page.waitForFunction('document.querySelector("body").innerText.includes("No chats")', {timeout: 5000})
                            .then(() => {
                                console.log("no contacts found...");
                                const code = 404;
                                fetch(`http://mydomain.com/consume-notification?pk=${notification.pk}&code=${code}`).then(response => {
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
                                await page.keyboard.type(notification.fields.message, {delay: 10});
                                await page.keyboard.press('Enter');
                                const code = 200;
                                fetch(`http://mydomain.com/consume-notification?pk=${notification.pk}&code=${code}`).then(response => {
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