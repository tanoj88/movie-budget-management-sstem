CREATE DATABASE IF NOT EXISTS movie_management_database;
USE movie_management_database;

CREATE TABLE IF NOT EXISTS Genre (
    Genre_ID INT AUTO_INCREMENT PRIMARY KEY,
    Genre_Name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Director (
    Director_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Gender VARCHAR(20),
    Date_of_Birth DATE,
    Bio TEXT,
    Photo_URL VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS Movie (
    Movie_ID INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(150) NOT NULL,
    Genre_ID INT,
    Director_ID INT,
    Language VARCHAR(50),
    Release_Date DATE,
    Duration INT,
    Description TEXT,
    Poster_URL VARCHAR(255),
    FOREIGN KEY (Genre_ID) REFERENCES Genre(Genre_ID),
    FOREIGN KEY (Director_ID) REFERENCES Director(Director_ID)
);

CREATE TABLE IF NOT EXISTS Movie_Cast (
    Cast_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Gender VARCHAR(20),
    Date_of_Birth DATE,
    Bio TEXT,
    Photo_URL VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS Movie_Role (
    Role_ID INT AUTO_INCREMENT PRIMARY KEY,
    Movie_ID INT NOT NULL,
    Cast_ID INT NOT NULL,
    Role_Name VARCHAR(100),
    FOREIGN KEY (Movie_ID) REFERENCES Movie(Movie_ID),
    FOREIGN KEY (Cast_ID) REFERENCES Movie_Cast(Cast_ID)
);

CREATE TABLE IF NOT EXISTS Users (
    User_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(150) UNIQUE,
    Password VARCHAR(255),
    Role VARCHAR(20) DEFAULT 'User'
);

CREATE TABLE IF NOT EXISTS Review (
    Review_ID INT AUTO_INCREMENT PRIMARY KEY,
    Movie_ID INT NOT NULL,
    User_ID INT NOT NULL,
    Rating DECIMAL(2,1),
    Review_Text TEXT,
    Review_Date DATE,
    FOREIGN KEY (Movie_ID) REFERENCES Movie(Movie_ID),
    FOREIGN KEY (User_ID) REFERENCES Users(User_ID)
);

CREATE TABLE IF NOT EXISTS Budget (
    Budget_ID INT AUTO_INCREMENT PRIMARY KEY,
    Movie_ID INT NOT NULL UNIQUE,
    Production_Cost DECIMAL(15,2),
    Marketing_Cost DECIMAL(15,2),
    Total_Budget DECIMAL(15,2),
    FOREIGN KEY (Movie_ID) REFERENCES Movie(Movie_ID)
);

CREATE TABLE IF NOT EXISTS Collection (
    Collection_ID INT AUTO_INCREMENT PRIMARY KEY,
    Movie_ID INT NOT NULL,
    Week_Number INT,
    Domestic_Collection DECIMAL(15,2),
    Overseas_Collection DECIMAL(15,2),
    Total_Collection DECIMAL(15,2),
    FOREIGN KEY (Movie_ID) REFERENCES Movie(Movie_ID)
);
