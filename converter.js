import fs from "node:fs"
import axios from "axios";
import { load } from "cheerio";

function xmlTemplate(id, series_title, series_episodes, my_start_date, my_finish_date, my_score, my_status,my_times_watched) {
    return`
    <anime>
        <series_animedb_id>${id}</series_animedb_id>
        <series_title><![CDATA[${series_title}]]></series_title>
        <my_status>${'Watching'}</my_status>
        <my_score>${my_score}</my_score>
        <my_start_date>${my_start_date}</my_start_date>
        <my_finish_date>${my_finish_date}</my_finish_date>
        <series_episodes>${series_episodes}</series_episodes>
        <my_times_watched>${my_times_watched}</my_times_watched>
        <update_on_import>1</update_on_import>
    </anime>
    `
}


async function getAnimeId(title) {
  const searchUrl = `https://myanimelist.net/search/all?q=${encodeURIComponent(title)}&cat=all`;
  
  try {
    // Fetch the search results page
    const response = await axios.get(searchUrl);    

    const html = response.data;


    // Load the HTML into cheerio
    const docs = load(html);

    const pattern = 'a.fw';

    let animeLink = null;
    if (docs(pattern).first().text().trim() == title) {
        animeLink = docs(pattern).first();
    }else {
        const animeList = docs('a.fw-b').each(function(i, ek){
            const test = docs(this).text();
            if(test == title){
                animeLink = docs(this);
                return false; // break the loop
            }
        });
    }

    if (!animeLink) {
      console.log(`No anime found for "${title}".`);
      return null;
    }
    
    // // Extract the anime ID from the link
    const animeUrl = animeLink.attr('href');
    const animeId = animeUrl.match(/\/anime\/(\d+)\//)[1];

    console.log(`Anime: ${title} | MAL ID: ${animeId}`);
    return animeId;
  } catch (error) {
    console.error(`Error fetching data for "${title}":`, error.message);
    return null;
  }
}

(function() {
    const data = (JSON.parse(fs.readFileSync("./data.json", "utf8"))).entries;
    
    let counter = 0;
    const iter = setInterval(async ()=> {

        const title = data[counter].name;

        const id = await getAnimeId(title);

        if(!id) {
            counter++
            return
        };

        const { 
            name, status,
            started, completed,
            rating, times, eps,
        } = data[counter];

        const buffer = xmlTemplate(id, name, eps, started, completed, rating, status, times);
        
        
        fs.appendFileSync("output.xml", buffer, { encoding: "utf8", flag: "a" });

        if(counter >= ((data.length - 1 ))) {
            clearInterval(iter);
            console.log("Finished!");
            return;
        }
        counter++;
    }, 100);

})()

