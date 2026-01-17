from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import pandas as pd
from bs4 import BeautifulSoup
import time
from urllib.parse import urljoin

options = Options()
# options.add_argument("--headless=new")

#web driver setup
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=options)

def scraper(soup):
    cards = soup.select(".collection-div")
    results = []
    detailed_results = []

    for card in cards:
        # https://www.popmartworld.com/collection/luminous-reverie-series
        link = card.select_one("a", id="Collection-Link")
        url = link["href"]
        details_url = "https://www.popmartworld.com" + url

        img = card.select_one("img")
        img_url = img["src"]

        name_link = card.find('a', attrs={'fs-cmsfilter-field': 'name'})
        series_name = name_link.text
        
        results.append({
            "series_title": series_name,
            "card_img": img_url,
            "detailed_url": details_url
        })

    for item in results:
        driver.get(item["detailed_url"])
        detail_soup = BeautifulSoup(driver.page_source, "html.parser")
        about_div = detail_soup.select(".w-richtext")

        for div in about_div:
            num_figures = div.select('p')
            try:
                coll_amt = []
                coll_names = []
                for p in num_figures:
                    num_figures_text = p.text
                    num_str = num_figures_text[:-1]
                    coll_amt.append(num_str)

                figures = div.select('[role="list"]')
                for figure in figures:
                    name_figs = figure.select("li")
                    for name_fig in name_figs:
                        coll_names.append(name_fig.text)

                detailed_results.append({
                    "amount": coll_amt,
                    "collection_names": coll_names
                })
            except:
                print("No details found")
    return results, detailed_results

def scrape_pagination(base_url: str):
    all_items = []
    current_url = base_url
    page_count = 1
    combined_df = pd.DataFrame

    while current_url:
        try:
            driver.get(url=current_url)
            soup = BeautifulSoup(driver.page_source, "html.parser")

            res, d_res = scraper(soup=soup)

            res_df = pd.DataFrame(res)
            d_res_df = pd.DataFrame(d_res)

            combined_df = pd.concat([res_df, d_res_df], axis = 1)
            # all_items.append({
            #     "page": page_count,
            #     "res": res,
            #     "d_res": d_res
            # })

            next_button = soup.find('a', {
                'aria-label': 'Next Page',
                'class': 'w-pagination-next'
            })


            if next_button and next_button.get('href'):
                next_url = next_button['href']
                print(next_url)
                # Handle relative URLs
                based = "https://www.popmartworld.com/collection"
                current_url = based + next_url
                print(current_url)
                
                page_count += 1
                time.sleep(1)  # Be respectful, add delay between requests
            else:
                print("No more pages found.")
                current_url = None
        except Exception as e:
            print(f"Unexpected error on page {page_count}: {e}")
            break
    # return all_items
        combined_df.to_csv("test.csv")
    return combined_df


def main(url:str):
    all_data = scrape_pagination(url)
    print(all_data)

    # with open('scraped_data.txt', 'w', encoding='utf-8') as f:
    #     for item in all_data:
    #         f.write(f"{item}\n")

if "__name__" == "__name__":
    main(url="https://www.popmartworld.com/collection?year=2025&subtypes=Series")