# PCSHomes Fort Drum Life Directory and Local Intelligence System

I went much wider than “things to do around Fort Drum.”

The opportunity is to make PCSHomes the page a Soldier or spouse opens when they think:

**“I don't know who the hell I'm supposed to call.”**

That means the same product should handle a Saturday hike, a VA appointment, WIC, a food emergency, a divorce, domestic violence, a PCS problem, child care, groceries, snowshoes, and “my spouse is deployed and I am losing it.”

I also dug into Find Your North. There is a very good integration opportunity there, but I **would not scrape or probe it aggressively**. Their published terms expressly prohibit bulk scraping and attempts to break or overload the service. More importantly, because you know the owner, scraping is the dumbest architecture available: you can get a clean first-party event feed instead. citeturn6view2

I built the first structured directory while researching:

**[Download the 77-record PCSHomes Fort Drum Family Directory CSV](sandbox:/mnt/data/pcshomes_fort_drum_family_directory_v1.csv)**

**[Download the map/database-ready JSON](sandbox:/mnt/data/pcshomes_fort_drum_family_directory_v1.json)**

**[Download the directory product schema](sandbox:/mnt/data/pcshomes_directory_product_schema.json)**

Those are starters, not “final truth.” Every record has a source, verification date, purpose, area and priority; one older local-resource record is intentionally marked for re-verification rather than presented as verified.

## What PCSHomes should actually become

Do **not** build another “Resources” page with 150 links alphabetized by agency name.

Nobody in distress thinks:

> “I wonder which directorate owns this function.”

They think:

> **I need food.**  
> **I need a doctor.**  
> **I need to get divorced.**  
> **I'm not safe at home.**  
> **I was sexually assaulted.**  
> **I can't pay for heat.**  
> **My kid needs special-needs services.**  
> **I need child care.**  
> **Where can I buy groceries?**  
> **What can we do Saturday?**  
> **Where's the VA?**  
> **Who do I call about my household goods?**

That should be the UI.

### The front door

I would put a universal search box near the top:

> **What do you need?**  
> _Try “food stamps,” “divorce,” “dentist,” “daycare,” “hiking,” “VA,” “domestic violence,” “groceries,” “IEP,” or “my heat got shut off.”_

Under it, give people plain-English intent cards:

| Need | User-facing language |
|---|---|
| Safety | **I'm in danger / I need help now** |
| Health | **I need medical or mental health care** |
| Food & money | **I need help with food, bills or money** |
| Legal | **I need legal help / divorce / custody** |
| Kids | **I need child care, school or EFMP help** |
| Military | **I need Fort Drum / PCS help** |
| Veterans | **I need VA care or veteran benefits** |
| Everyday life | **Groceries, clothes, pharmacy, DMV, etc.** |
| Local life | **What can we do around here?** |
| Outdoors | **Hiking, fishing, boating, skiing, hunting** |

Then make results extremely utilitarian:

**CALL** · **DIRECTIONS** · **OPEN NOW?** · **WHO CAN USE IT?** · **LAST VERIFIED**

That is the product.

Not paragraphs.

For emergency records, **Call** should be visually dominant. For parks/events, **Directions / Save / Add to calendar** should dominate. For benefits, **Am I eligible? / Apply** should dominate.

The underlying dataset should still contain agency terminology and acronyms for search. A person typing `FAP`, `DV`, `husband hit me`, `domestic abuse`, `victim advocate`, or `not safe at home` should all reach the same relevant pathways.

### Build aliases, not just categories

This is a major detail.

Search should understand that:

`food stamps = SNAP`  
`heating help = HEAP`  
`daycare assistance = Child Care Assistance Program`  
`JAG = Legal Assistance`  
`special needs = EFMP`  
`sexual assault = SHARP / Safe Helpline`  
`wife/husband hit me = domestic violence / FAP / VAC`  
`ER = emergency department`  
`VA doctor = Watertown VA / Syracuse VA`  
`moving truck damaged my stuff = household goods claim`  
`need money now = AER / DSS / food pantry / utility support`

That one decision will make this directory feel ten times smarter than a government resource page.

## The safety, family and “bad day” layer

This is where PCSHomes can become unusually valuable.

The current ecosystem is fragmented across Army pages, county agencies, the VA, hospitals, nonprofits, state resources and federal hotlines. A family should not have to know which bureaucracy owns their problem.

### Make one “Help now” screen

At the very top:

**Immediate danger or medical emergency — 911.** Fort Drum notes that a cellular 911 call made on post initially reaches Jefferson County dispatch; callers should identify that they are on Fort Drum so the call can be routed appropriately. citeturn22search24turn9view0

Then split the screen by actual problem.

**Suicide / mental-health crisis:** call **988 and press 1** for the Military/Veterans Crisis Line. Fort Drum also lists Jefferson County Crisis Response at **315-782-2327** and Mobile Crisis Services at **315-788-0970**. Samaritan operates its own 24/7 urgent mental-health line at **315-785-4516**. citeturn9view0turn16search2

**Sexual assault:** Fort Drum SHARP is **315-767-6128**; DoD Safe Helpline is **877-995-5247**. These should be immediately visible without requiring someone to enter their name, email or phone number into PCSHomes. citeturn9view0

**Domestic abuse:** Fort Drum's current Family Advocacy Program lists a 24/7 victim-advocate crisis line at **315-955-4321**, with **315-772-5605** and **315-772-8934** during regular duty hours. citeturn16search0

**Off-post DV/SA help:** the Victims Assistance Center of Jefferson County operates a 24-hour hotline at **315-782-1855** and office line at **315-782-1823**, providing services including domestic-violence, sexual-assault, trafficking and shelter support. citeturn11search0turn11search3

**New York statewide DV help:** **800-942-6906**, with text support at **844-997-2121**. citeturn14search11

**Child abuse:** the national Childhelp hotline listed by Fort Drum is **800-422-4453**. citeturn9view0

**Emergency military-family communication:** the American Red Cross Hero Care Center is **877-272-7337**, 24/7/365. This matters when a family emergency needs to reach a deployed or geographically separated service member. citeturn23search2turn23search18

**Chaplain:** Fort Drum's current chaplain page gives the 24-hour number as **315-486-1144**. I found older/current Army pages carrying different chaplain numbers, which is exactly why your system needs source dates and an audit trail instead of a phone number hard-coded forever. citeturn9view3

### A very important UX rule

For DV and SA, I would **not** put a PCSHomes lead form anywhere in the path.

No:

> Tell us what happened and we'll connect you.

Instead:

> **Talk directly to a confidential support resource**

Then give the number.

You should collect virtually nothing about someone using the crisis portion of the directory. That reduces both risk and fear.

### Divorce and family-law navigation

This is another place where an intelligent routing page would beat a list of offices.

A military-connected person asking **“I need to get divorced”** should first see Fort Drum Legal Assistance at **315-772-3067**. Legal Assistance serves eligible military clients on personal civil legal matters, including family-law issues. citeturn1search7turn1search13

For qualifying civilian legal aid, the Legal Aid Society of Mid-New York's Watertown office is **315-955-6700**, with its HelpLine at **877-777-6152**. Its practice areas include qualifying family-law and domestic-violence matters. citeturn14search0turn14search25

Then explain a distinction almost nobody arriving from another state will know:

**In New York, the divorce action itself is brought in Supreme Court.** Jefferson County Supreme & County Court is at 163 Arsenal Street and lists **315-570-2950**. Jefferson County Family Court, **315-570-2970**, deals with matters such as custody, support, visitation and family offenses rather than granting the divorce itself. citeturn14search15turn14search1

That can become:

> ### I need to get divorced
> **Military family?** Start with Fort Drum Legal Assistance → CALL  
> **Need low-cost civil legal help?** Legal Aid → CALL  
> **Need divorce court information?** Jefferson County Supreme Court → CALL / DIRECTIONS  
> **Custody, support or family offense?** Family Court → CALL / DIRECTIONS  
> **Not safe at home?** Skip this page → GET HELP NOW

That's genuinely useful.

## Food, money, health care, VA and daily survival

This is where I'd expand aggressively.

### Food stamps, WIC, heating and child-care assistance

The main county “I need assistance” front door is **Jefferson County Department of Social Services**, 250 Arsenal Street, Watertown, **315-785-3000**. DSS handles or routes SNAP, Temporary Assistance, HEAP and related services; it currently allows SNAP, Temporary Assistance and HEAP applications through New York's online benefits system as well as other submission channels. DSS also has a renovation underway and is currently directing visitors to a temporary side entrance, another example of information that should have a freshness field. citeturn21view1

For users, don't lead with **DSS**.

Lead with:

> **I need help buying food** → SNAP  
> **I'm pregnant / have a baby / young child and need food help** → WIC  
> **I can't afford heat** → HEAP  
> **I need help paying for daycare** → Child Care Assistance

For WIC, North Country Family Health Center runs the local program. The WIC line is **315-782-9222**; its Watertown site is at **238 Arsenal Street**, with another service location in the LeRay/Evans Mills area. citeturn12search1

For immediate pantry help, Community Action Planning Council's food pantry can be reached at **315-782-4900 ext. 221** for pantry scheduling, with ext. 222 for program information. It also has an online choice-pantry system. citeturn17search8

For military emergency money, Fort Drum Army Emergency Relief is **315-772-6560** and can provide qualifying Soldiers/families with emergency financial assistance through loans, grants or combinations depending on the circumstances. Fort Drum directs certain after-hours emergency-travel situations through the Red Cross at **877-272-7337**. citeturn23search14turn23search22

Fort Drum's Financial Readiness Program is **315-772-5196**, while ACS Information & Referral is **315-772-6799** or **800-826-0886**. The latter should essentially be PCSHomes' **“I don't know who I need”** military fallback. citeturn22search1

### Groceries and basic shopping

For authorized patrons, the Fort Drum Commissary currently lists **315-221-7600** and customer service at **315-221-7611**. The current DeCA page lists seven-day operation, although holiday and operational changes should always be treated as volatile. citeturn17search1

Major off-post one-stop/grocery options I verified include:

**Walmart Supercenter, Watertown — 315-786-0145.** This is particularly useful in a PCS directory because it simultaneously solves groceries, clothing, basic home goods and arrival-day supplies. citeturn17search10

**Hannaford, Watertown — 315-782-7456**, with grocery pickup/delivery and other supermarket services listed at the store. citeturn17search6

**Price Chopper, Arsenal Street — 315-788-1645.** citeturn17search2

I deliberately **did not fill the dataset with every random retailer returned by business-directory sites.** For a trusted directory, I'd rather have 100 maintained entries than 500 stale ones.

There is still a category to expand before production: **free/very-low-cost clothing, furniture, household goods and emergency material assistance**. Fort Drum's older community guide identifies organizations such as Watertown Urban Mission, but because those records are older I marked the Urban Mission record in the dataset **Needs recheck** instead of pretending it was freshly verified. That is the behavior Bishop should enforce across the whole system. citeturn22search21

### On-post medical care

Guthrie Army Health Clinic is at 11050 Mount Belvedere Boulevard. The current MEDDAC page gives **1-888-838-1303** for appointments and lists weekday primary-care operations; TRICARE's contact page also lists **315-772-4655**. citeturn16search5turn16search11

One important thing to tell new families clearly:

**Guthrie does not operate an emergency or urgent-care service.** The Fort Drum medical system explicitly directs emergency and urgent care to local TRICARE-network facilities. citeturn16search35

Samaritan Medical Center's emergency department is at 830 Washington Street in Watertown, with **315-785-4000** as its hospital/emergency contact. citeturn16search6

Samaritan also operates urgent care at its LeRay Medical Building near Fort Drum; the current location listing gives **315-629-4080**. citeturn16search34

### The Watertown and Syracuse VA needs special handling

This is more interesting than I expected because I found **a VA data inconsistency you should not blindly reproduce.**

The current VA Watertown Clinic page identifies its facility header at **1222 Arsenal Street, Suite 10A, Watertown** and describes primary care plus mental-health, women's health, radiology, laboratory and other services. citeturn21view2

However, lower on that **same VA page**, its primary-care section still identifies a “Watertown VA Clinic” at **144 Eastern Boulevard**. Jefferson County's own VA-health page also references the Eastern Boulevard clinic and a specialty location at **19472 US Route 11**. citeturn21view2turn23search8

That is exactly the kind of mess PCSHomes can solve without pretending the ambiguity doesn't exist.

I would display:

> **Watertown VA care**  
> Main clinic routing: **315-425-8240**  
> VA Health Connect: **800-877-6976**  
> Mental Health: **315-425-3463**  
> **Multiple Watertown VA service locations exist. Confirm the address shown on your appointment before driving.**

The current VA search data gives those Watertown/VA Health Connect/mental-health numbers. citeturn1search1

For higher-level VA care, the **Syracuse VA Medical Center** is at **800 Irving Avenue, Syracuse**, with main number **315-425-4400**, VA Health Connect **800-877-6976**, and mental-health routing **315-425-3463**. citeturn1search23turn21view3

Also don't overlook the **Watertown Vet Center**, 1511 Washington Street, Suite A, **315-782-5479**, with its after-hours call center at **877-927-8387**. Vet Centers are particularly relevant to readjustment counseling and should not be buried under generic “VA.” citeturn23search24

And the **Jefferson County Veterans Service Agency**, 175 Arsenal Street, 2nd Floor, **315-785-3086**, provides free local assistance navigating VA claims and benefits. citeturn23search0turn23search4

I would therefore make “Veteran” results split into three choices:

> **I need health care** → Watertown VA / Syracuse VA  
> **I need counseling / readjustment support** → Vet Center  
> **I need help with a claim or benefits** → County Veterans Service Agency

That is much easier than making someone understand VA organizational structure.

## Outdoors and the North Country should be a real product surface

The mistake would be making “outdoors” a blog post called **Top 10 Things to Do Near Fort Drum.**

The geography around Drum is actually one of your strongest retention features.

A PCS site normally stops being useful after the move.

A living events + outdoors layer gives people a reason to keep opening PCSHomes **after they're settled**.

### Close-to-home recreation

**Fort Drum Outdoor Recreation**, Bldg. 11115 on Iraqi Freedom Drive, is **315-772-8222** and provides rentals, trips and outdoor programming. Its equipment operation includes winter gear such as snowshoes, skis, snowboards, fat bikes and ice-fishing equipment. citeturn15search0turn15search3

For recreation on Fort Drum training lands, iSportsman matters. The Sportsman's Hotline is **855-267-9770**, and users recreating in applicable training areas must follow current access and check-in/check-out rules. citeturn15search31turn15search22

That's a perfect PCSHomes card:

> **Want to hike/fish/hunt on Fort Drum?**  
> Check whether the area is open before leaving → CHECK STATUS  
> Sportsman's Hotline → CALL

**Black River Trail** is an easy family/fitness win: it is a 4.5-mile paved former railroad corridor, with about 3.5 miles along the Black River, supporting walking, running and biking and seasonal snowshoe/cross-country ski use. citeturn20search20

Watertown Parks and Recreation is **315-785-7775** and manages local recreational assets along the Black River and elsewhere in the city. citeturn15search5

### Lake Ontario and Henderson

This whole cluster deserves its own map filter.

**Southwick Beach State Park — 315-846-5338.** It combines a long sandy swimming beach with camping, hiking and access to the adjacent Lakeview Wildlife Management Area and coastal dune environment; the trail network also supports winter snowshoeing and cross-country skiing. citeturn20search2

**Robert G. Wehle State Park** has about **1,100 acres and more than 17,000 feet of Lake Ontario shoreline**, giving you a completely different type of hiking/coastal experience. citeturn20search1

**Westcott Beach State Park** adds Lake Ontario swimming/camping, playground and picnic infrastructure, bass fishing and hiking trails that serve cross-country skiers in winter. citeturn20search3

And farther down the lake, **Whetstone Gulf** on the Tug Hill edge gives you the gorge/hiking side of the region rather than the beach side. NYS Parks describes a three-mile-long gorge with major scenic vistas. citeturn20search17

### Sackets Harbor

Sackets should absolutely be a “local day” destination inside PCSHomes rather than merely another town.

The village's tourism site promotes its Heritage Trail, waterfront, family biking, paddling, sailing, boating, fishing, War of 1812 history and year-round events. The visitor center is **315-646-2321**. citeturn19search0turn19search26

Think:

> **Saturday with kids**  
> Sackets Harbor  
> 25–40° → indoor + lunch options  
> Sunny → Heritage Trail + waterfront  
> EVENT TODAY → overlay Find Your North events

Now the site is helping someone **live there**, not merely buy a house there.

### Thousand Islands

**Wellesley Island State Park** should be a featured anchor. The park combines camping, cabins/cottages, marina, boat launches, hiking, fishing, swimming and winter activity. citeturn20search4turn20search15

Within it, the **Minna Anthony Common Nature Center** sits on roughly a 600-acre peninsula, with **eight miles of hiking trails and seven miles of cross-country ski trails**, plus fishing and water access. citeturn20search0

The regional tourism council can be reached at **315-482-2520** and covers broader Thousand Islands activities such as boating, paddling, fishing and diving. citeturn19search26turn19search29

The practical map filters I would use are:

**Kids** · **Dogs** · **Free** · **Under 2 hours** · **Hike** · **Bike** · **Beach** · **Boat/Paddle** · **Fish** · **Hunt** · **Camp** · **Winter** · **Date night** · **Rainy day** · **This weekend**

And then:

**Open now**  
**Event today**  
**Event this weekend**

That's where Find Your North becomes extremely useful.

## Find Your North is your event engine, but partner with it instead of scraping it

I spent time examining the public product structure.

Find Your North is already doing a lot of the hard work you would otherwise have to recreate. It aggregates upcoming events across Upstate New York from libraries, schools, venues, churches, town offices and organizers, and supports useful categories such as family activities, outdoors, sports, live music, food/drink, arts/culture and free events. citeturn6view0turn6view1

The Jefferson County feed already surfaces exactly the kind of material PCSHomes needs: Fort Drum MWR activities, hikes, paddling/kayak events, Sackets Harbor activities, live music and other date-specific local events. citeturn6view0

A public event record already contains useful structured concepts including:

**title**  
**date/time**  
**category**  
**county**  
**organizer**  
**description/summary**  
**source link**  
**record last updated**

That is visible on individual event pages. citeturn5view0

And Find Your North already references **calendar-feed subscriptions**, which tells me the application is conceptually set up for machine-consumable date data in at least some form. citeturn6view2

### Why I stopped at the public surface

Their terms expressly say **no bulk scraping** and no attempts to break or overload the service. They also distinguish Find Your North's own content from third-party event-listing content, where source ownership remains with the original provider. citeturn6view2

So I would not have Bishop hammer their application, hunt for an accidentally public database key, bypass controls, or scrape thousands of pages.

You know the owner.

Have the two systems shake hands.

### The ideal architecture

Find Your North exposes one read-only server endpoint:

```text
GET /api/v1/events
    ?county=Jefferson
    &from=2026-09-24
    &to=2026-10-24
    &category=outdoors,family,free
    &updated_since=...
```

Return:

```json
{
  "id": "stable-event-id",
  "slug": "bald-mountain-hike-...",
  "title": "Bald Mountain Hike",
  "start_at": "2026-09-26T08:00:00-04:00",
  "end_at": "2026-09-26T12:00:00-04:00",
  "timezone": "America/New_York",
  "all_day": false,
  "status": "scheduled",
  "venue": {
    "name": "...",
    "address": "...",
    "city": "...",
    "county": "Jefferson",
    "lat": 0,
    "lng": 0
  },
  "categories": ["outdoors", "family"],
  "organizer": "...",
  "summary": "...",
  "source_url": "...",
  "event_url": "...",
  "image_url": "...",
  "updated_at": "...",
  "verified_at": "..."
}
```

PCSHomes then **does not copy Find Your North's whole product**.

It consumes the event data and gives it PCS context.

Example:

> ### This weekend near Fort Drum
> **Bald Mountain Hike**  
> Saturday · 8 AM  
> Outdoors · Family  
> 42 miles away  
> [Directions] [Save] [Full event details]

Underneath:

> Event information via Find Your North. Verify details before leaving.

Then link back to the source/event record.

### What PCSHomes adds that Find Your North doesn't need to

Your value layer is **military-family context**.

PCSHomes can know:

> Family has kids under 5  
> Lives in Carthage  
> Spouse deployed  
> Wants free activities  
> Doesn't want >45-minute drive  
> Weather tomorrow is awful  
> Event is on post and requires installation access

Find Your North remains the event intelligence source.

PCSHomes becomes the military-family decision layer.

That is a much better partnership than cloning them.

### Event lifecycle rules

Events must automatically disappear from “upcoming” once ended.

A cancellation should become:

> **CANCELLED**

not silently vanish.

A changed date should invalidate caches.

Each event should retain:

```text
source_id
source_url
source_updated_at
ingested_at
last_seen_at
status
```

I would sync at a moderate interval rather than live-query Find Your North every time a PCSHomes user opens the map. Cache locally, honor `ETag` / `Last-Modified` if they provide them, and update incrementally.

That protects both products.

### Security design

Because this is friendly server-to-server access, I would make it boring:

**Read-only API key or signed server token.**

Restrict it to the PCSHomes backend, not a key shipped in browser JavaScript.

Rate-limit it.

No user PII.

Stable event IDs.

Pagination.

CORS only where needed.

Server logs.

Key rotation.

A separate development key.

A webhook later for `event.created`, `event.updated`, and `event.cancelled` if you want near-real-time changes.

And **no direct PCSHomes access to the Find Your North production database**. An API boundary is much safer for both sides.

## The CC + Bishop execution prompt

This is the prompt I'd hand them. It deliberately treats Find Your North as a partner integration, not a target to scrape.

```text
PROJECT: PCSHomes Fort Drum Life Directory + Find Your North Events Integration

MISSION
Turn PCSHomes into the easiest single utility for Fort Drum service members
and families to answer:

1. Who do I call?
2. Where do I go?
3. What do I do?
4. What is happening near me?
5. Is this information still current?

We are integrating two systems we control/cooperate with:
- PCSHomes
- Find Your North

Do NOT scrape, bypass controls, probe for exposed secrets, or access Find Your
North data outside authorized interfaces. Find Your North's published terms
prohibit bulk scraping. Build a sanctioned read-only integration.

PART A — DIRECTORY

Import:
pcshomes_fort_drum_family_directory_v1.json

Implement a directory datastore with at minimum:

id
name
category
subcategory
intent_tags[]
phone_primary
phone_secondary
sms
address
city
state
zip
lat
lng
hours_structured
hours_display
eligibility
description
emergency boolean
priority P0/P1/P2
status active/seasonal/temporarily_closed/needs_recheck
source_name
source_url
source_updated_at
verified_at
expires_at
last_checked_at
change_history[]
admin_notes

Do not delete historical values when a phone/address changes.
Record changes.

Create verification cadences:
P0 crisis/safety: check every 7 days
P0 government/medical: check every 30 days
P1: check every 60 days
P2/local recreation/retail: check every 90 days
Event data: controlled by event feed timestamps

Any failed verification should enter a review queue rather than silently
removing the resource.

DIRECTORY UX

Do NOT lead with agency names.

Primary search:
"What do you need?"

Support natural-language and alias matching for:
food stamps
SNAP
food
hungry
WIC
pregnant
baby food
can't pay heat
HEAP
utilities
daycare
child care
divorce
custody
lawyer
JAG
domestic violence
husband hit me
wife hit me
not safe
sexual assault
rape
SHARP
mental health
suicide
crisis
doctor
ER
urgent care
VA
veteran benefits
EFMP
special needs
IEP
PCS
household goods
moving damage
housing
groceries
clothes
hiking
fishing
camping
things to do
events
this weekend

Top-level user choices:

HELP NOW
HEALTH & MENTAL HEALTH
FOOD, MONEY & BENEFITS
LEGAL, DIVORCE & FAMILY
KIDS, SCHOOL & CHILD CARE
FORT DRUM & PCS
VETERANS & VA
GROCERIES, CLOTHES & EVERYDAY LIFE
OUTDOORS
EVENTS & THINGS TO DO

For a directory result show, in order:
Name
1-sentence "use this for" description
CALL
DIRECTIONS
hours/open state
eligibility
last verified
source

Emergency records:
- no lead capture
- no marketing CTA
- no referral monetization
- call action first
- allow immediate exit from page
- never log sensitive search text tied to identity

Create emergency routes:
911
988 press 1
Fort Drum SHARP
DoD Safe Helpline
Fort Drum FAP crisis hotline
Victims Assistance Center Jefferson County
NYS DV hotline
National DV hotline
Jefferson County crisis
Samaritan mental-health hotline
Poison Control
24-hour chaplain
Red Cross Hero Care

PART B — MAP

Geocode directory records server-side.
Store:
lat
lng
geocoder
geocoded_at
geocode_confidence

Never invent coordinates.

Map layers:
Emergency/support
Medical
VA/veterans
Food/benefits
Legal
Kids/family
Shopping
Fort Drum services
Outdoor recreation
Events

Map/list toggle.

Filters:
Open now
Near me
Under 15 min
Under 30 min
Under 60 min
Free
Kids
Dogs
Indoor
Outdoor
Accessible
Military only
Veterans
Emergency
This weekend

PART C — FIND YOUR NORTH API

On Find Your North, implement a read-only partner endpoint.

Preferred:
GET /api/v1/events

Parameters:
from
to
county
city
category
updated_since
page
limit

Return:
id
slug
title
start_at
end_at
timezone
all_day
status
venue.name
venue.address
venue.city
venue.county
venue.lat
venue.lng
categories[]
organizer
summary
image_url
event_url
source_url
source_name
source_updated_at
updated_at

Requirements:
- stable IDs
- pagination
- JSON
- explicit America/New_York timestamps
- cancellation status
- updated timestamps
- lat/lng where available
- rate limiting
- API key/signed server authentication
- no PII
- no database credentials exposed
- ETag or Last-Modified support
- logs
- key rotation

Optional later:
webhooks for
event.created
event.updated
event.cancelled

PART D — PCSHOMES EVENT INGESTION

PCSHomes server fetches the authorized event feed.
Do not expose the partner API credential in client JavaScript.

Cache events in PCSHomes.
Perform incremental sync using updated_since.
Deduplicate using Find Your North stable ID.

Store:
external_provider = find_your_north
external_id
external_url
source_url
ingested_at
last_seen_at
source_updated_at

Expired events:
do not show in Upcoming.

Cancelled:
display CANCELLED until event date passes.

Changed event:
update while retaining prior revision in change history.

UI attribution:
"Event information via Find Your North"
with link to full/source event.

PART E — PCS CONTEXT

PCSHomes adds its own classification without modifying the source event:

family_friendly
under_5_friendly
teen_friendly
free
indoor
outdoor
dog_friendly
accessible
military_access_required
estimated_drive_band_from_fort_drum
rainy_day
winter
date_night

Do not make unsupported claims.
Each manually assigned attribute needs an admin-editable field.

PART F — FRESHNESS SYSTEM

Every directory fact must support:
source_url
verified_at
expires_at
status

Admin dashboard:
RED = P0 stale/failed
ORANGE = due within 7 days
NORMAL = current

Show users:
"Verified Sep 24, 2026"

Do not show an old "verified" date if a source check failed.

Create a daily Bishop job that:
1. selects due records
2. checks authoritative public source
3. compares phone/address/hours/status
4. proposes changes
5. automatically updates only low-risk deterministic fields
6. requires human review for P0 crisis, legal, medical and benefit changes
7. stores a diff and evidence
8. alerts on source failure

PART G — QA

Before deployment test these exact searches:

"I need food"
"food stamps"
"I am pregnant and need WIC"
"I can't pay for heat"
"I need daycare"
"I need to get divorced"
"my husband hit me"
"I was sexually assaulted"
"I want to kill myself"
"I need a VA doctor"
"I need help with my VA claim"
"my kid has special needs"
"where is urgent care"
"my furniture got damaged in the move"
"where can I buy groceries"
"where can I get clothes"
"what can I do with kids Saturday"
"hiking near Fort Drum"
"fishing"
"events this weekend"

Each query must return the correct first action in <=2 taps.

SPECIAL QA:
- Divorce must not incorrectly tell the user that NY Family Court grants divorce.
- Guthrie must not be represented as an ER/urgent-care facility.
- Watertown VA must warn users to confirm the appointment location while
  VA's own public pages contain differing Watertown addresses.
- No DV/SA/crisis path may require login, name, phone or lead form.
- No Find Your North scraping.
- No unverified phone should appear as "verified."

DELIVERABLE
Ship the directory database, search, map layers, admin freshness queue,
Find Your North authenticated event endpoint, PCSHomes event ingestion,
event/list/map UI, and automated tests above.
```

## My strongest recommendation

You have two different moats forming here.

The first is **local intelligence**:

Fort Drum + Watertown + Sackets + Lake Ontario + Tug Hill + Thousand Islands + Syracuse + events.

The second is more important:

**“Whatever happens to my family while we're stationed here, PCSHomes knows where I should start.”**

That encompasses CYS Parent Central at **315-772-8675**, EFMP at **315-772-5476**, Employment Readiness at **315-772-1090**, TAP at **315-772-3434**, AER at **315-772-6560**, ACS referral at **315-772-6799**, Fort Drum Mountain Community Homes at **315-836-4168**, and scores of other services that currently live across disconnected systems. citeturn9view4turn22search3turn22search10turn22search2turn23search14turn22search1turn25search2

The difficult part is no longer acquiring a pile of phone numbers.

The difficult part is maintaining **trustworthy routing**.

A phone number changes.  
A clinic moves.  
HEAP closes for the season.  
An event gets cancelled.  
A pantry changes hours.  
A VA page contradicts another VA field.  
A crisis hotline is updated.  
A park closes its swimming beach.  
An office changes buildings.

Your competitors will publish another static “Fort Drum Resources” article.

PCSHomes should instead know:

> **Source: official**  
> **Verified: September 24, 2026**  
> **Open now: yes/no**  
> **Call**  
> **Directions**  
> **Who can use this**  
> **Here's the next-best option if they're closed**

That is why the verification system is more valuable than simply having a larger directory.

The initial build now contains **77 structured records** across crisis/safety, medical/VA, benefits and food, legal/divorce, Fort Drum family support, groceries/everyday needs, veterans and outdoor/local life:

**[PCSHomes Fort Drum Family Directory — CSV](sandbox:/mnt/data/pcshomes_fort_drum_family_directory_v1.csv)**

**[PCSHomes Fort Drum Family Directory — JSON](sandbox:/mnt/data/pcshomes_fort_drum_family_directory_v1.json)**

**[Directory/Search Product Schema](sandbox:/mnt/data/pcshomes_directory_product_schema.json)**

The North Country piece then plugs into that same system: **places are persistent; events are temporal.** Find Your North supplies the changing event layer, PCSHomes supplies the Fort Drum/family context, and Bishop keeps the permanent-resource layer from rotting.

That combination is much bigger than a PCS guide. It is effectively a **Fort Drum family operating system**.