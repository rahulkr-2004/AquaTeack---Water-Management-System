CREATE TABLE invitations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    apartment_id BIGINT NOT NULL,
    block VARCHAR(50) NOT NULL,
    flat_number VARCHAR(50) NOT NULL,
    document_aadhar LONGTEXT,
    document_photo LONGTEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invitation_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id)
);
