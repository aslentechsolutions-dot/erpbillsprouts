with open('src/pages/admin/purchases/PurchaseModal.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('₹', 'Rs. ')

with open('src/pages/admin/purchases/PurchaseModal.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed rupee symbols in PurchaseModal.jsx')
