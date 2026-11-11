# 04 — User Flows

## 1. Customer QR ordering flow
```mermaid
flowchart TD
    A[Scan table QR] --> B[Resolve QR token]
    B --> C{QR valid and table active?}
    C -- No --> D[Show invalid / ask restaurant]
    C -- Yes --> E[Open or join table session]
    E --> F[Load restaurant menu]
    F --> G[Browse categories / search]
    G --> H[Open product]
    H --> I[Choose size, options, add-ons]
    I --> J[Add to cart]
    J --> K{Continue shopping?}
    K -- Yes --> G
    K -- No --> L[Review cart]
    L --> M[Submit order]
    M --> N{Server validation passes?}
    N -- No --> O[Show clear correction message]
    O --> L
    N -- Yes --> P[Create order]
    P --> Q[Show confirmation and tracking]
    Q --> R[Receive live status updates]
```

## 2. Kitchen flow
```mermaid
flowchart TD
    A[New order persisted] --> B[Kitchen queue receives update]
    B --> C[Group items by preparation station]
    C --> D[Kitchen accepts order]
    D --> E[Start preparation]
    E --> F[Update item status]
    F --> G{All items ready?}
    G -- No --> E
    G -- Yes --> H[Order marked ready]
    H --> I[Customer/admin sees ready status]
    I --> J[Order served]
    J --> K[Session/bill completed]
```

## 3. Admin setup flow
```mermaid
flowchart TD
    A[Admin signs in] --> B[Create restaurant workspace]
    B --> C[Set restaurant profile and settings]
    C --> D[Create menu categories]
    D --> E[Create products and prices]
    E --> F[Configure variants and add-ons]
    F --> G[Assign preparation stations]
    G --> H[Create tables]
    H --> I[Generate and print unique QR codes]
    I --> J[Publish menu]
    J --> K[Run test order]
    K --> L[Restaurant ready to launch]
```

## 4. Admin daily operations flow
```mermaid
flowchart TD
    A[Admin dashboard] --> B[Review live orders and table activity]
    B --> C[Update menu availability if needed]
    C --> D[Review sales and order summaries]
    D --> E[Resolve cancellations or billing exceptions]
```

## 5. Exceptional cases to handle
- Invalid, expired or revoked QR.
- Table inactive or session closed.
- Product becomes unavailable after being added to cart.
- Price changes while cart is open.
- Customer double-taps Place Order.
- Customer loses connectivity after submitting.
- Realtime event missed after reconnect.
- Kitchen rejects/cancels an item with a reason.
- Partial readiness when items are prepared by different stations.
- Payment pending, failed or duplicated callback.
