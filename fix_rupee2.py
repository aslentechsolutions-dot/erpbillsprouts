with open("src/pages/admin/purchases/PurchaseModal.jsx", "rb") as f: content = f.read()
content = content.replace(b"\xc3\xa2\xc2\x82\xc2\xb9", b"Rs. ")
with open("src/pages/admin/purchases/PurchaseModal.jsx", "wb") as f: f.write(content)
print("Fixed")
