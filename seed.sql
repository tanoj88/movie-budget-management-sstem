USE movie_management_database;

-- 1. Genres (8)
INSERT INTO Genre (Genre_ID, Genre_Name) VALUES
(1, 'Sci-Fi'),
(2, 'Thriller'),
(3, 'Drama'),
(4, 'Action'),
(5, 'Adventure'),
(6, 'Comedy'),
(7, 'Horror'),
(8, 'Musical');

-- 2. Directors (6)
INSERT INTO Director (Director_ID, Name, Gender, Date_of_Birth, Bio, Photo_URL) VALUES
(1, 'Elena Vance', 'Female', '1976-04-12', 'Acclaimed speculative cinema director known for large-format practical effects and cosmic worldbuilding.', '/src/assets/images/portrait_director_studio_1795149384264.jpg'),
(2, 'Marcus Thorne', 'Male', '1971-09-28', 'Neo-noir specialist whose razor-sharp urban thrillers dominate autumn box-office corridors.', '/src/assets/images/portrait_director_studio_1795149384264.jpg'),
(3, 'Aarav Mehta', 'Male', '1980-01-17', 'International adventure and ensemble filmmaker blending location epics with crisp pacing.', ''),
(4, 'Claire Moreau', 'Female', '1983-07-03', 'Paris-born auteur celebrated for intimate musical dramas and orchestral soundscapes.', ''),
(5, 'Ji-hoon Park', 'Male', '1974-11-21', 'Seoul-based dramatic stylist focusing on high-tension character studies and winter cinematography.', ''),
(6, 'Devon Brooks', 'Male', '1985-05-09', 'High-velocity action choreographer and blockbuster franchise helmer.', '');

-- 3. Cast Members (15)
INSERT INTO Movie_Cast (Cast_ID, Name, Gender, Date_of_Birth, Bio, Photo_URL) VALUES
(1, 'Julian Mercer', 'Male', '1986-03-14', 'Versatile leading actor recognized for intense dramatic and sci-fi anchor performances.', '/src/assets/images/portrait_actor_studio_1795149383965.jpg'),
(2, 'Sora Takahashi', 'Female', '1991-08-22', 'Bilingual international star spanning Tokyo and Hollywood tentpoles.', ''),
(3, 'Liam Gallagher-Cruz', 'Male', '1982-12-05', 'Character actor and co-lead prized for gravelly courtroom and thriller roles.', '/src/assets/images/portrait_actor_studio_1795149383965.jpg'),
(4, 'Nadia Kouri', 'Female', '1989-06-19', 'Stage-trained dramatic actress and classical pianist.', ''),
(5, 'Mateo Silva', 'Male', '1993-02-11', 'Breakout action lead with stunt-choreography background.', ''),
(6, 'Hannah Lindqvist', 'Female', '1984-10-30', 'Nordic cinema veteran acclaimed for subtle psychological portraits.', ''),
(7, 'Rohan Kapoor', 'Male', '1988-07-27', 'Box-office magnet across South Asian and global adventure productions.', ''),
(8, 'Camille Laurent', 'Female', '1994-04-08', 'Conservatory-trained vocalist and leading musical performer.', ''),
(9, 'Min-seo Kang', 'Female', '1990-01-25', 'Critically lauded Seoul theater and cinema protagonist.', ''),
(10, 'Owen Whitaker', 'Male', '1975-09-16', 'Veteran supporting powerhouse portraying mentors, commanders, and antagonists.', ''),
(11, 'Zara Al-Mansoor', 'Female', '1992-11-04', 'Rising sci-fi and thriller ensemble standout.', ''),
(12, 'Tobias Weber', 'Male', '1981-05-29', 'European character specialist fluent in four languages.', ''),
(13, 'Priya Nair', 'Female', '1995-03-18', 'Comedic timing and ensemble warmth specialist.', ''),
(14, 'Kenji Watanabe', 'Male', '1979-12-12', 'Acclaimed thriller and genre actor from Osaka.', ''),
(15, 'Chloe Bennett', 'Female', '1996-08-02', 'Young dramatic lead with strong festival pedigree.', '');

-- 4. Movies (10)
INSERT INTO Movie (Movie_ID, Title, Genre_ID, Director_ID, Language, Release_Date, Duration, Description, Poster_URL) VALUES
(1, 'Orbital Horizon', 1, 1, 'English', '2025-11-14', 148, 'An atmospheric expedition beyond Saturn uncovers an ancient orbital beacon that forces a stranded crew to choose between survival and disclosure.', '/src/assets/images/poster_orbital_horizon_1795149382446.jpg'),
(2, 'Crimson Verdict', 2, 2, 'English', '2025-09-19', 129, 'During a relentless autumn storm, a disbarred prosecutor tracks a whistleblower across rain-slicked precincts before sunrise.', '/src/assets/images/poster_crimson_verdict_1795149382496.jpg'),
(3, 'Emerald Monsoon', 5, 3, 'Hindi', '2024-12-20', 156, 'A cartographer and a river guide cross flooded mountain valleys to recover a lost botanical archive before winter closes the passes.', '/src/assets/images/poster_emerald_monsoon_1795149382865.jpg'),
(4, 'Velvet Encore', 8, 4, 'French', '2025-03-07', 122, 'After a decade away from the stage, a concert pianist returns to a historic Paris hall for one final performance under mounting debts.', '/src/assets/images/poster_velvet_encore_1795149383101.jpg'),
(5, 'Obsidian Winter', 3, 5, 'Korean', '2024-02-09', 134, 'Two estranged siblings reunite at a snowbound coastal observatory to settle their late father''s architectural estate.', ''),
(6, 'Neon Protocol', 4, 6, 'English', '2026-05-22', 138, 'An elite extraction unit races through six transit hubs in twelve hours to neutralize a hijacked satellite array.', ''),
(7, 'Glass Symphony', 3, 4, 'English', '2023-10-13', 118, 'A chamber quartet prepares for a career-defining recording session while confronting unspoken creative rivalries.', '/src/assets/images/poster_velvet_encore_1795149383101.jpg'),
(8, 'Desert Mirage', 1, 1, 'Spanish', '2023-07-21', 141, 'Solar engineers stationed in the Atacama Desert encounter unexplained temporal anomalies beneath an array field.', '/src/assets/images/poster_orbital_horizon_1795149382446.jpg'),
(9, 'Midnight Signal', 7, 2, 'Japanese', '2024-10-25', 108, 'Late-night railway dispatchers begin receiving distress calls from a decommissioned mountain tunnel sealed thirty years ago.', '/src/assets/images/poster_crimson_verdict_1795149382496.jpg'),
(10, 'Paper Lanterns', 6, 3, 'English', '2026-02-14', 112, 'Three competing wedding planners accidentally book the same historic botanical estate for a single holiday weekend.', '/src/assets/images/poster_emerald_monsoon_1795149382865.jpg');

-- 5. Movie Roles
INSERT INTO Movie_Role (Movie_ID, Cast_ID, Role_Name) VALUES
(1, 1, 'Commander Caleb Vance'),
(1, 2, 'Dr. Rei Sato'),
(1, 10, 'Director Arthur Hale'),
(1, 11, 'Flight Engineer Zara'),
(2, 3, 'Detective Ray Donovan'),
(2, 6, 'Judge Ingrid Lind'),
(2, 12, 'Viktor Kroll'),
(3, 7, 'Arjun Sen'),
(3, 13, 'Meera Joshi'),
(3, 10, 'Colonel Pemberton'),
(4, 8, 'Clara Delacroix'),
(4, 4, 'Maestro Helene'),
(4, 12, 'Henri Laurent'),
(5, 9, 'Seo-yeon Kim'),
(5, 14, 'Inspector Takahashi'),
(5, 6, 'Dr. Astrid Holm'),
(6, 5, 'Agent Mateo Cross'),
(6, 11, 'Sable'),
(6, 1, 'Commander Mercer'),
(6, 10, 'Director Sterling'),
(7, 4, 'Elena Rostova'),
(7, 8, 'Claire Moreau-Dupont'),
(7, 15, 'Sophie Vance'),
(8, 5, 'Dr. Diego Navarro'),
(8, 2, 'Yuki Tanaka'),
(8, 3, 'Supervisor Morales'),
(9, 14, 'Station Master Kenji'),
(9, 2, 'Aoi Hayashi'),
(9, 9, 'Min-ji'),
(10, 13, 'Priya Sharma'),
(10, 1, 'Oliver Grant'),
(10, 15, 'Chloe Bennett-Hayes');

-- 6. Budgets (Total_Budget = Production_Cost + Marketing_Cost)
INSERT INTO Budget (Movie_ID, Production_Cost, Marketing_Cost, Total_Budget) VALUES
(1, 110000000.00, 45000000.00, 155000000.00),
(2, 42000000.00, 23000000.00, 65000000.00),
(3, 55000000.00, 20000000.00, 75000000.00),
(4, 24000000.00, 11000000.00, 35000000.00),
(5, 48000000.00, 17000000.00, 65000000.00),
(6, 78000000.00, 32000000.00, 110000000.00),
(7, 18000000.00, 9000000.00, 27000000.00),
(8, 85000000.00, 30000000.00, 115000000.00),
(9, 15000000.00, 10000000.00, 25000000.00),
(10, 22000000.00, 12000000.00, 34000000.00);

-- 7. Weekly Collections (4-6 weeks per movie, Total_Collection = Domestic + Overseas)
INSERT INTO Collection (Movie_ID, Week_Number, Domestic_Collection, Overseas_Collection, Total_Collection) VALUES
-- Movie 1: Orbital Horizon (6 weeks -> $349M)
(1, 1, 68000000.00, 74000000.00, 142000000.00),
(1, 2, 41000000.00, 48000000.00, 89000000.00),
(1, 3, 24500000.00, 31500000.00, 56000000.00),
(1, 4, 14000000.00, 18000000.00, 32000000.00),
(1, 5, 8200000.00, 10800000.00, 19000000.00),
(1, 6, 4300000.00, 6700000.00, 11000000.00),
-- Movie 2: Crimson Verdict (5 weeks -> $80.5M)
(2, 1, 16500000.00, 14500000.00, 31000000.00),
(2, 2, 11200000.00, 10800000.00, 22000000.00),
(2, 3, 6800000.00, 7200000.00, 14000000.00),
(2, 4, 4100000.00, 4400000.00, 8500000.00),
(2, 5, 2400000.00, 2600000.00, 5000000.00),
-- Movie 3: Emerald Monsoon (5 weeks -> $141M)
(3, 1, 29000000.00, 21000000.00, 50000000.00),
(3, 2, 22000000.00, 17000000.00, 39000000.00),
(3, 3, 14500000.00, 11500000.00, 26000000.00),
(3, 4, 8500000.00, 7500000.00, 16000000.00),
(3, 5, 5200000.00, 4800000.00, 10000000.00),
-- Movie 4: Velvet Encore (5 weeks -> $60M)
(4, 1, 9500000.00, 11500000.00, 21000000.00),
(4, 2, 7200000.00, 9800000.00, 17000000.00),
(4, 3, 4900000.00, 6100000.00, 11000000.00),
(4, 4, 3100000.00, 3900000.00, 7000000.00),
(4, 5, 1800000.00, 2200000.00, 4000000.00),
-- Movie 5: Obsidian Winter (4 weeks -> $46.5M)
(5, 1, 9200000.00, 11800000.00, 21000000.00),
(5, 2, 5400000.00, 7600000.00, 13000000.00),
(5, 3, 3100000.00, 4900000.00, 8000000.00),
(5, 4, 1900000.00, 2600000.00, 4500000.00),
-- Movie 6: Neon Protocol (6 weeks -> $290M)
(6, 1, 54000000.00, 62000000.00, 116000000.00),
(6, 2, 33000000.00, 41000000.00, 74000000.00),
(6, 3, 20500000.00, 26500000.00, 47000000.00),
(6, 4, 12000000.00, 16000000.00, 28000000.00),
(6, 5, 6500000.00, 9500000.00, 16000000.00),
(6, 6, 3800000.00, 5200000.00, 9000000.00),
-- Movie 7: Glass Symphony (4 weeks -> $30.7M)
(7, 1, 6800000.00, 5200000.00, 12000000.00),
(7, 2, 4900000.00, 4100000.00, 9000000.00),
(7, 3, 3100000.00, 2900000.00, 6000000.00),
(7, 4, 1900000.00, 1800000.00, 3700000.00),
-- Movie 8: Desert Mirage (4 weeks -> $66.7M)
(8, 1, 16000000.00, 15000000.00, 31000000.00),
(8, 2, 9500000.00, 9500000.00, 19000000.00),
(8, 3, 5200000.00, 5800000.00, 11000000.00),
(8, 4, 2600000.00, 3100000.00, 5700000.00),
-- Movie 9: Midnight Signal (4 weeks -> $21.25M)
(9, 1, 5400000.00, 4600000.00, 10000000.00),
(9, 2, 3200000.00, 2800000.00, 6000000.00),
(9, 3, 1800000.00, 1700000.00, 3500000.00),
(9, 4, 900000.00, 850000.00, 1750000.00),
-- Movie 10: Paper Lanterns (5 weeks -> $46.3M)
(10, 1, 10200000.00, 6800000.00, 17000000.00),
(10, 2, 7800000.00, 5200000.00, 13000000.00),
(10, 3, 5100000.00, 3400000.00, 8500000.00),
(10, 4, 3000000.00, 2000000.00, 5000000.00),
(10, 5, 1700000.00, 1100000.00, 2800000.00);

-- 8. Users (1 Admin, 2 Users)
-- Default Admin password: Admin@123 | Default User password: User@123
INSERT INTO Users (User_ID, Name, Email, Password, Role) VALUES
(1, 'Victoria Sterling', 'admin@studiopulse.com', '$2b$10$weuJvEMxAG3/AKDDp35t8O584NZ5pIL0TVJTLurADp7d8N.7v2h1m', 'Admin'),
(2, 'Daniel Mercer', 'producer@studiopulse.com', '$2b$10$RN/BwX3molxqtvNBOFXzguZmJYxMs.gPZ9hInmkSCwzLaABwl09Ia', 'User'),
(3, 'Sofia Chen', 'analyst@studiopulse.com', '$2b$10$RN/BwX3molxqtvNBOFXzguZmJYxMs.gPZ9hInmkSCwzLaABwl09Ia', 'User');

-- 9. Reviews (one review per user per movie)
INSERT INTO Review (Movie_ID, User_ID, Rating, Review_Text, Review_Date) VALUES
(1, 1, 4.8, 'Monumental sound design and restrained emotional stakes that sustained strong word-of-mouth through week six.', '2025-11-20'),
(1, 2, 4.6, 'Practical miniature work pays off in IMAX; repeat theatrical viewings drove overseas retention.', '2025-11-22'),
(2, 2, 4.1, 'Taut noir pacing with standout cinematography, though third-act twists narrowed broad family appeal.', '2025-09-25'),
(2, 3, 3.9, 'Strong opening weekend hold in urban markets; marketing spend felt slightly heavy relative to midweek drops.', '2025-09-29'),
(3, 1, 4.7, 'Gorgeous location photography and rousing score made it an unstoppable holiday earner.', '2024-12-26'),
(3, 3, 4.5, 'Consistent week-on-week legs across both domestic and diaspora territories.', '2025-01-03'),
(4, 2, 4.6, 'Intimate chamber drama that punched well above its modest production budget.', '2025-03-14'),
(5, 3, 3.4, 'Critically admired atmosphere, but bleak tone limited mainstream multiplex turnover.', '2024-02-18'),
(6, 1, 4.5, 'Relentless kinetic choreography; global action appetite pushed it past break-even in week one.', '2026-05-26'),
(6, 2, 4.4, 'Cleanest stunt work of the summer slate with massive overseas multiplier.', '2026-05-30'),
(7, 3, 4.0, 'Smart mid-budget counterprogramming that steadily recouped its print and ad commitment.', '2023-10-22'),
(8, 2, 2.9, 'Ambitious visuals could not offset convoluted pacing and steep second-week erosion.', '2023-08-01'),
(9, 3, 3.2, 'Effective late-night soundscapes, though niche runtime curtailed wide circuit expansion.', '2024-11-02'),
(10, 2, 4.2, 'Warm ensemble chemistry and crisp holiday release timing delivered reliable profits.', '2026-02-20');
