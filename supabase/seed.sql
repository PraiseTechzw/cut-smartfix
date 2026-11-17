-- CUT SmartFix location seed data.
-- Only published names and room codes supplied for Chinhoyi Main and Town
-- campuses are included. Floor names explicitly indicate where a floor number
-- was not available; no room numbers or building assignments are inferred.

insert into campuses (name, code, address, is_active)
values
  ('Chinhoyi Main Campus', 'CUT-MAIN', null, true),
  ('Town Campus', 'CUT-TOWN', null, true)
on conflict (name) do update
set code = excluded.code,
    is_active = excluded.is_active;

with campus_areas (campus_name, area_name) as (
  values
    ('Chinhoyi Main Campus', 'Academic & Teaching'),
    ('Chinhoyi Main Campus', 'Administration'),
    ('Chinhoyi Main Campus', 'Boys'' Hostels'),
    ('Chinhoyi Main Campus', 'Girls'' Hostels'),
    ('Chinhoyi Main Campus', 'Sports & Recreation'),
    ('Chinhoyi Main Campus', 'Student Services'),
    ('Town Campus', 'Specialist & Teaching Facilities')
)
insert into areas (campus_id, name, is_active)
select campuses.id, campus_areas.area_name, true
from campus_areas
join campuses on campuses.name = campus_areas.campus_name
on conflict (campus_id, name) do update
set is_active = excluded.is_active;

with area_buildings (campus_name, area_name, building_name, building_code) as (
  values
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Block 10', 'B10'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Teaching Rooms (block not identified)', null),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Lecture Theatre', null),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Great Hall', null),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Laboratories', null),
    ('Chinhoyi Main Campus', 'Administration', 'Administration Block', null),
    ('Chinhoyi Main Campus', 'Boys'' Hostels', 'Block A', null),
    ('Chinhoyi Main Campus', 'Boys'' Hostels', 'Block B', null),
    ('Chinhoyi Main Campus', 'Boys'' Hostels', 'Block C', null),
    ('Chinhoyi Main Campus', 'Boys'' Hostels', 'Block D', null),
    ('Chinhoyi Main Campus', 'Girls'' Hostels', 'Block V', null),
    ('Chinhoyi Main Campus', 'Girls'' Hostels', 'Block W', null),
    ('Chinhoyi Main Campus', 'Girls'' Hostels', 'Block X', null),
    ('Chinhoyi Main Campus', 'Girls'' Hostels', 'Block Y', null),
    ('Chinhoyi Main Campus', 'Girls'' Hostels', 'Block Z', null),
    ('Chinhoyi Main Campus', 'Sports & Recreation', 'Gym Hall', null),
    ('Chinhoyi Main Campus', 'Sports & Recreation', 'Sports Pavilion', null),
    ('Chinhoyi Main Campus', 'Sports & Recreation', 'Sports Grounds', null),
    ('Chinhoyi Main Campus', 'Student Services', 'Library', null),
    ('Chinhoyi Main Campus', 'Student Services', 'Canteen', null),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Mechatronics Laboratory', null),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Creative Art and Design', null),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Clothing and Textile Design', null),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Teaching Rooms (building not identified)', null)
)
insert into buildings (area_id, name, code, is_active)
select areas.id, area_buildings.building_name, area_buildings.building_code, true
from area_buildings
join campuses on campuses.name = area_buildings.campus_name
join areas on areas.campus_id = campuses.id
  and areas.name = area_buildings.area_name
on conflict (area_id, name) do update
set code = excluded.code,
    is_active = excluded.is_active;

with building_floors (campus_name, area_name, building_name, floor_name, level_number) as (
  select
    campus_name,
    area_name,
    building_name,
    'Floor not published',
    null::integer
  from (values
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Block 10'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Teaching Rooms (block not identified)'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Lecture Theatre'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Great Hall'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Laboratories'),
    ('Chinhoyi Main Campus', 'Administration', 'Administration Block'),
    ('Chinhoyi Main Campus', 'Boys'' Hostels', 'Block A'),
    ('Chinhoyi Main Campus', 'Boys'' Hostels', 'Block B'),
    ('Chinhoyi Main Campus', 'Boys'' Hostels', 'Block C'),
    ('Chinhoyi Main Campus', 'Boys'' Hostels', 'Block D'),
    ('Chinhoyi Main Campus', 'Girls'' Hostels', 'Block V'),
    ('Chinhoyi Main Campus', 'Girls'' Hostels', 'Block W'),
    ('Chinhoyi Main Campus', 'Girls'' Hostels', 'Block X'),
    ('Chinhoyi Main Campus', 'Girls'' Hostels', 'Block Y'),
    ('Chinhoyi Main Campus', 'Girls'' Hostels', 'Block Z'),
    ('Chinhoyi Main Campus', 'Sports & Recreation', 'Gym Hall'),
    ('Chinhoyi Main Campus', 'Sports & Recreation', 'Sports Pavilion'),
    ('Chinhoyi Main Campus', 'Student Services', 'Library'),
    ('Chinhoyi Main Campus', 'Student Services', 'Canteen'),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Mechatronics Laboratory'),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Creative Art and Design'),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Clothing and Textile Design'),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Teaching Rooms (building not identified)')
  ) as buildings (campus_name, area_name, building_name)
  union all
  values ('Chinhoyi Main Campus', 'Sports & Recreation', 'Sports Grounds', 'Outdoor / ground level', 0)
)
insert into floors (building_id, name, level_number, is_active)
select buildings.id, building_floors.floor_name, building_floors.level_number, true
from building_floors
join campuses on campuses.name = building_floors.campus_name
join areas on areas.campus_id = campuses.id
  and areas.name = building_floors.area_name
join buildings on buildings.area_id = areas.id
  and buildings.name = building_floors.building_name
on conflict (building_id, name) do update
set level_number = excluded.level_number,
    is_active = excluded.is_active;

with room_seed (campus_name, area_name, building_name, floor_name, room_name, room_number, room_type) as (
  values
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Block 10', 'Floor not published', 'B10-3', 'B10-3', 'Classroom'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Block 10', 'Floor not published', 'B10-4', 'B10-4', 'Classroom'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Block 10', 'Floor not published', 'B10-5', 'B10-5', 'Classroom'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Block 10', 'Floor not published', 'B10-6', 'B10-6', 'Classroom'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Teaching Rooms (block not identified)', 'Floor not published', 'E1', 'E1', 'Teaching room'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Teaching Rooms (block not identified)', 'Floor not published', 'E2', 'E2', 'Teaching room'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Teaching Rooms (block not identified)', 'Floor not published', 'E3', 'E3', 'Teaching room'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Teaching Rooms (block not identified)', 'Floor not published', 'E4', 'E4', 'Teaching room'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Teaching Rooms (block not identified)', 'Floor not published', 'E5', 'E5', 'Teaching room'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Teaching Rooms (block not identified)', 'Floor not published', 'E6', 'E6', 'Teaching room'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Teaching Rooms (block not identified)', 'Floor not published', 'EW2', 'EW2', 'Teaching room'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Lecture Theatre', 'Floor not published', 'Lecture Theatre', null, 'Facility'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Great Hall', 'Floor not published', 'Great Hall', null, 'Facility'),
    ('Chinhoyi Main Campus', 'Academic & Teaching', 'Laboratories', 'Floor not published', 'Laboratories', null, 'Facility'),
    ('Chinhoyi Main Campus', 'Administration', 'Administration Block', 'Floor not published', 'Administration Block', null, 'Facility'),
    ('Chinhoyi Main Campus', 'Sports & Recreation', 'Gym Hall', 'Floor not published', 'Gym Hall', null, 'Facility'),
    ('Chinhoyi Main Campus', 'Sports & Recreation', 'Sports Pavilion', 'Floor not published', 'Sports Pavilion', null, 'Facility'),
    ('Chinhoyi Main Campus', 'Sports & Recreation', 'Sports Grounds', 'Outdoor / ground level', 'Sports Grounds', null, 'Outdoor facility'),
    ('Chinhoyi Main Campus', 'Student Services', 'Library', 'Floor not published', 'Library', null, 'Facility'),
    ('Chinhoyi Main Campus', 'Student Services', 'Canteen', 'Floor not published', 'Canteen', null, 'Facility'),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Mechatronics Laboratory', 'Floor not published', 'Mechatronics Laboratory', null, 'Facility'),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Creative Art and Design', 'Floor not published', 'Creative Art and Design', null, 'Facility'),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Clothing and Textile Design', 'Floor not published', 'Clothing and Textile Design', null, 'Facility'),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Teaching Rooms (building not identified)', 'Floor not published', 'TC1', 'TC1', 'Teaching room'),
    ('Town Campus', 'Specialist & Teaching Facilities', 'Teaching Rooms (building not identified)', 'Floor not published', 'TC2', 'TC2', 'Teaching room')
)
insert into rooms (floor_id, name, room_number, room_type, is_active)
select floors.id, room_seed.room_name, room_seed.room_number, room_seed.room_type, true
from room_seed
join campuses on campuses.name = room_seed.campus_name
join areas on areas.campus_id = campuses.id
  and areas.name = room_seed.area_name
join buildings on buildings.area_id = areas.id
  and buildings.name = room_seed.building_name
join floors on floors.building_id = buildings.id
  and floors.name = room_seed.floor_name
on conflict (floor_id, name) do update
set room_number = excluded.room_number,
    room_type = excluded.room_type,
    is_active = excluded.is_active;
