import linebot from 'linebot'
import dotenv from 'dotenv'
import rp from 'request-promise'
import cheerio from 'cheerio'

dotenv.config()

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
})

// ------------ 抓取搜尋食譜的結果 -------------------------------------------------------------------------
const search = async (food) => {
  let msg = []
  let kw = encodeURI(food)
  let rcs = []
  // ---------------------- 撈出 total 個食譜 -------------------------------------------------------------------------------
  // 頁數
  let i = 0
  try {
    const result = await rp({
      uri: `https://icook.tw/search/${kw}/?page=${i + 1}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36'
      }
    })
    const $ = cheerio.load(result)

    for (let a = 0; a < 18; a++) {
      let id = $('figure').eq(a).attr('data-recipe-id')
      let pic = $('figure').eq(a).find('img').eq(0).attr('data-src')
      let title = $('figure').eq(a).find('span').eq(0).attr('title')
      let cook = $('figcaption').eq(a).find('span').eq(1).text()
      let web = $('figure').eq(a).find('a').eq(0).attr('href')
      rcs.push({
        'id': id,
        'pic': pic,
        'title': title,
        'cook': cook,
        'web': 'https://icook.tw' + web
      })
    }
    // console.log(rcs)
    msg.push(rcs)

  }
  catch (error) {
    msg = error.message
  }

  return msg
}

const getCount = async (data) => {
  let counts = []
  try {
    const recipe = await rp({
      uri: `https://icook.tw/recipes/${data}`,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36"
      }
    })

    let $ = cheerio.load(recipe)
    let arr = []
    for (let i = 0; i < 20; i++) {
      arr.push($('.ingredient').eq(i).attr('class'))
      if (arr[i] == undefined) {
        break
      }
    }
    console.log(arr + "-----------------------------------this is arr")
    counts.push(arr.length - 1)

    let arr1 = []
    for (let i = 0; i < 20; i++) {
      arr1.push($('.step').eq(i).attr('class'))
      if (arr1[i] == undefined) {
        break
      }
    }
    console.log(arr1 + "-----------------------------------this is arr1")
    counts.push(arr1.length - 1)

    return counts
  } catch (error) {

  }
}

// ------------ 抓取食譜的內容 -----------------------------------------------------------------------------
const getRecipe = async (data, counts) => {

  // const urlTitle = encodeURI(data.title)
  try {
    const recipe = await rp({
      uri: `https://icook.tw/recipes/${data}`,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36"
      }
    })
    // console.log(recipe)
    let $ = cheerio.load(recipe)

    let title = $('#recipes_show').find('article').eq(1).find('h1').text()
    let photo = $('#recipes_show').find('img').eq(0).attr('src')

    let ingredients = []
    for (let i = 0; i < counts[0]; i++) {
      ingredients.push([$('.ingredient').eq(i).find('a').text(), $('.ingredient').eq(i).find('.ingredient-unit').text()])
    }
    console.log(ingredients)

    let step = []
    for (let i = 0; i < counts[1]; i++) {
      step.push($('.step').eq(i).find('.step-instruction-content').text().trim().replace(/\r\n|\n/g, ""))
    }

    let d = {
      'title': title.trim(),
      'photo': photo,
      'ingredients': ingredients,
      'step': step
    }

    console.log(d)
    return d
  }
  catch (error) {
    console.log(error)
  }
}

// --------- 使用者傳送訊息時要做的事 ---------------------------------------------------------------------------------
bot.on('message', async (event) => {
  let msg
  let msg1
  let msg12
  let msg123
  let rcs = []
  let msgs

  if (event.message.text.includes('找')) {
    msgs = await search(event.message.text.slice(2))

  }

  /*
  else if (event.message.text.includes('食譜')) 
  { 
    msg = recipe(event.message.text.slice(3))
  }*/
  // event.reply(event.message.text)
  // let stk = {
  //   "type": "sticker",
  //   "packageId": "11539",
  //   "stickerId": "52114122"
  // }

  for (let i = 0; i < 5; i++) {
    let rc = {
      "type": "bubble",
      "size": "micro",
      "hero": {
        "type": "image",
        "url": msgs[0][i].pic,
        "size": "full",
        "aspectRatio": "20:13",
        "aspectMode": "cover",
        "action": {
          "type": "uri",
          "uri": msgs[0][i].web
        }
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": msgs[0][i].title,
            "weight": "bold",
            "size": "md"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "margin": "none",
            "spacing": "sm",
            "contents": [
              {
                "type": "box",
                "layout": "baseline",
                "spacing": "sm",
                "contents": [
                  {
                    "type": "text",
                    "text": "by",
                    "color": "#aaaaaa",
                    "size": "xs",
                    "flex": 1
                  },
                  {
                    "type": "text",
                    "text": msgs[0][i].cook,
                    "wrap": true,
                    "color": "#666666",
                    "size": "xs",
                    "flex": 7
                  }
                ]
              }
            ]
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "style": "link",
            "height": "sm",
            "action": {
              "type": "postback",
              "label": "看食譜",
              "data": msgs[0][i].id
            }
          },
          {
            "type": "button",
            "style": "link",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "網頁版",
              "uri": msgs[0][i].web
            }
          },
          {
            "type": "spacer",
            "size": "sm"
          }
        ],
        "flex": 0,
        // "backgroundColor": "#ffcc33"
      },
      "styles": {
        "body": {
          "backgroundColor": "#ffffaa"
        }
      }
      // }
    }
    rcs.push(rc)
  }

  {
    msg1 = {
      'type': 'template',
      'altText': 'this is a carousel template',
      'template': {
        'type': 'carousel',
        'columns': [{
          'thumbnailImageUrl': 'https://example.com/bot/images/item1.jpg',
          'title': 'this is menu',
          'text': 'description',
          'actions': [{
            'type': 'postback',
            'label': 'Buy',
            'data': 'action=buy&itemid=111'
          }, {
            'type': 'postback',
            'label': 'Add to cart',
            'data': 'action=add&itemid=111'
          }, {
            'type': 'uri',
            'label': 'View detail',
            'uri': 'http://example.com/page/111'
          }]
        }, {
          'thumbnailImageUrl': 'https://example.com/bot/images/item2.jpg',
          'title': 'this is menu',
          'text': 'description',
          'actions': [{
            'type': 'postback',
            'label': 'Buy',
            'data': 'action=buy&itemid=222'
          }, {
            'type': 'postback',
            'label': 'Add to cart',
            'data': 'action=add&itemid=222'
          }, {
            'type': 'uri',
            'label': 'View detail',
            'uri': 'http://example.com/page/222'
          }]
        }]
      }
    }

    msg12 = {
      "type": "text",
      "text": "你居住在台灣的哪個縣市?",
      "quickReply": {
        "items": [
          {
            "type": "action",
            "imageUrl": "https://xxx/image1.png",
            "action": {
              "type": "message",
              "label": "A.台北",
              "text": "台北"
            }
          },
          {
            "type": "action",
            "imageUrl": "https://xxx/image2.png",
            "action": {
              "type": "message",
              "label": "B.台中",
              "text": "台中"
            }
          },
          {
            "type": "action",
            "action": {
              "type": "location",
              "label": "選擇地點"
            }
          }
        ]
      }
    }

    msg123 =
    {
      "type": "flex",
      "altText": "this is a flex message",
      "contents": {
        "type": "carousel",
        "contents": [
          {
            "type": "bubble",
            "size": "nano",
            "header": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "In Progress",
                  "color": "#ffffff",
                  "align": "start",
                  "size": "md",
                  "gravity": "center"
                },
                {
                  "type": "text",
                  "text": "70%",
                  "color": "#ffffff",
                  "align": "start",
                  "size": "xs",
                  "gravity": "center",
                  "margin": "lg"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        {
                          "type": "filler"
                        }
                      ],
                      "width": "70%",
                      "backgroundColor": "#0D8186",
                      "height": "6px"
                    }
                  ],
                  "backgroundColor": "#9FD8E36E",
                  "height": "6px",
                  "margin": "sm"
                }
              ],
              "backgroundColor": "#27ACB2",
              "paddingTop": "19px",
              "paddingAll": "12px",
              "paddingBottom": "16px"
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    {
                      "type": "text",
                      "text": "Buy milk and lettuce before class",
                      "color": "#8C8C8C",
                      "size": "sm",
                      "wrap": true
                    }
                  ],
                  "flex": 1
                }
              ],
              "spacing": "md",
              "paddingAll": "12px"
            },
            "styles": {
              "footer": {
                "separator": false
              }
            }
          },
          {
            "type": "bubble",
            "size": "nano",
            "header": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "Pending",
                  "color": "#ffffff",
                  "align": "start",
                  "size": "md",
                  "gravity": "center"
                },
                {
                  "type": "text",
                  "text": "30%",
                  "color": "#ffffff",
                  "align": "start",
                  "size": "xs",
                  "gravity": "center",
                  "margin": "lg"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        {
                          "type": "filler"
                        }
                      ],
                      "width": "30%",
                      "backgroundColor": "#DE5658",
                      "height": "6px"
                    }
                  ],
                  "backgroundColor": "#FAD2A76E",
                  "height": "6px",
                  "margin": "sm"
                }
              ],
              "backgroundColor": "#FF6B6E",
              "paddingTop": "19px",
              "paddingAll": "12px",
              "paddingBottom": "16px"
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    {
                      "type": "text",
                      "text": "Wash my car",
                      "color": "#8C8C8C",
                      "size": "sm",
                      "wrap": true
                    }
                  ],
                  "flex": 1
                }
              ],
              "spacing": "md",
              "paddingAll": "12px"
            },
            "styles": {
              "footer": {
                "separator": false
              }
            }
          },
          {
            "type": "bubble",
            "size": "nano",
            "header": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "In Progress",
                  "color": "#ffffff",
                  "align": "start",
                  "size": "md",
                  "gravity": "center"
                },
                {
                  "type": "text",
                  "text": "100%",
                  "color": "#ffffff",
                  "align": "start",
                  "size": "xs",
                  "gravity": "center",
                  "margin": "lg"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        {
                          "type": "filler"
                        }
                      ],
                      "width": "100%",
                      "backgroundColor": "#7D51E4",
                      "height": "6px"
                    }
                  ],
                  "backgroundColor": "#9FD8E36E",
                  "height": "6px",
                  "margin": "sm"
                }
              ],
              "backgroundColor": "#A17DF5",
              "paddingTop": "19px",
              "paddingAll": "12px",
              "paddingBottom": "16px"
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    {
                      "type": "text",
                      "text": "Buy milk and lettuce before class",
                      "color": "#8C8C8C",
                      "size": "sm",
                      "wrap": true
                    }
                  ],
                  "flex": 1
                }
              ],
              "spacing": "md",
              "paddingAll": "12px"
            },
            "styles": {
              "footer": {
                "separator": false
              }
            }
          }
        ]
      }
    }
  }

  try {
    event.reply(
      {

        "type": "flex",
        "altText": "this is a flex message",
        "contents": {
          "type": "carousel",
          "contents": rcs
        }
      }
    )
    // event.reply(msg123)
  } catch (error) {

    console.log(error)
  }

})

// --------- 使用者點選按鈕時要做的事 ---------------------------------------------------------------------------------
bot.on('postback', async (event) => {
  let data = event.postback.data
  let showRecipe
  let counts = []
  let foods = [
    {
      "type": "text",
      "text": "食材",
      "size": "lg",
      "weight": "bold",
      "align": "center"
    }
  ]
  console.log(data)
  counts = await getCount(data)
  showRecipe = await getRecipe(data, counts)

  for (let r of showRecipe.ingredients) {

    let food =
    {
      "type": "box",
      "layout": "horizontal",
      "contents": [
        {
          "type": "text",
          "text": r[0],
          "flex": 7
        },
        {
          "type": "text",
          "text": r[1],
          "flex": 3
        }
      ]
    }
    foods.push(food)
  }

  let cont = [
    {
      "type": "bubble",
      "hero": {
        "type": "image",
        "url": showRecipe.photo,
        "aspectMode": "cover",
        "size": "full",
        "aspectRatio": "20:13"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": showRecipe.title,
            "size": "lg",
            "weight": "bold"
          }
        ]
      }
    },
    {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": foods
      },
      "styles": {
        "body": {
          "backgroundColor": "#fad0c4"
        }
      }
    }

  ]
  for (let r in showRecipe.step) {
    let s = {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": '步驟' + (parseInt(r) + 1),
            "size": "xl",
            "weight": "bold",
            "align": "center"
          },
          {
            "type": "text",
            "text": showRecipe.step[r],
            "wrap": true,
            "offsetTop": "15%",
            "size": "lg"
          }

        ]
      },
      "styles": {
        "body": {
          "backgroundColor": "#ffd1ff"
        }
      }
    }
    cont.push(s)

  }

  let recipeCarousel = {
    "type": "flex",
    "altText": "請在手機裡查看唷",
    "contents": {
      "type": "carousel",
      "contents": cont
    }
  }
  event.reply(recipeCarousel)
})

bot.listen('/', process.env.Port)

