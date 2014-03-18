from ijson import items

f = open('data_json/recipe/03_11_2013.json', 'rb')
recipes = items(f, 'item')

for recipe in items(f, 'item'):
    for ingredient in recipe["ingredients"]:
        print(ingredient["name"])
    for instruction in recipe["todo"]:
        print(instruction["instruction"])
