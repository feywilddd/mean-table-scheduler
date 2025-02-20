# Diagramme d'entité-relation

```mermaid
erDiagram
    users {
        uuid user_id PK
        string name
        string email
        string password_hash
        enum user_role
        bool is_deleted
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }
    restaurants {
        uuid restaurant_id PK
        string name
        string address
        string phone
        timestamptz created_at
        timestamptz updated_at
    }
    tables {
        uuid table_id PK
        uuid restaurant_id FK
        int number
        int seats
        bool is_deleted
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }
    reservations {
        uuid reservation_id PK
        uuid user_id FK
        uuid table_id FK
        int seats_taken
        timestamptz start_time
        timestamptz end_time
        timestamptz created_at
        timestamptz updated_at
    }
    users ||--o{ reservations : ""
    restaurants ||--o{ tables : ""
    tables ||--o{ reservations : ""
```
