# What broke when we self-hosted, explained simply

This is the plain-English version of `TROUBLESHOOTING.md`. That file is the
technical reference; this one is for actually understanding *why* things
broke, in normal words.

## The one-sentence version

We swapped a piece of infrastructure that used to do a bunch of small jobs
for us automatically, for a simpler one that only does the main job — and
every one of those small jobs had to be found and rebuilt by hand, one at a
time, only after something broke because of it.

## The picture to hold in your head

Imagine a hotel that used to have a concierge at the front desk. Besides the
obvious job — telling guests which room is theirs — the concierge quietly did
a bunch of other small things: checking a guest's ID before letting them
through, translating requests between departments, forwarding messages. All
invisible, all just... handled.

Then the hotel replaced the concierge with a plain directory sign that just
points to room numbers. The sign does the main job fine — guests find their
rooms. But every one of those small invisible tasks the concierge used to do?
Gone. Nobody notices until a real guest walks up, tries to check in, and gets
turned away because nobody's there to check their ID anymore.

That's basically what happened here. The "concierge" was a piece of software
called **Kong**, which used to sit in front of our login/database/file-storage
services and quietly stamp every response with something like a note saying
"yes, this website is allowed to ask me things." We replaced Kong with a much
simpler traffic-router (Nginx) that just sends requests to the right place —
but never learned to write that note. That note has a real name: **CORS**
(you'll see it in error messages as "CORS policy"). It's just the website
equivalent of an ID check — proof that the website asking a question is
actually allowed to.

## Why testing with `curl` didn't catch it

Early on, everything looked fine because I kept testing with a command-line
tool (`curl`) that doesn't care about that ID-check note at all — it just
asks the question directly, like a hotel employee walking straight into a
room instead of using the front desk. Only an actual web browser enforces the
ID check. So the plumbing looked completely fine right up until you actually
tried to use the real website in a real browser — which is exactly why this
kind of bug only shows up during real testing, not automated checks.

## The specific things that went wrong, one at a time

1. **No ID-check note at all.** First attempt: the login page couldn't talk
   to the login service because there was no note being written at all.
   Fixed by teaching the traffic-router to write one.

2. **Two contradictory notes on the same response.** One of our services
   (the one that reads data, PostgREST) was already writing its own version
   of the note, and now the traffic-router was writing a second, different
   one on top. Two different answers to "who's allowed in" is treated as
   nobody's allowed in. Fixed by telling the traffic-router to remove the
   old note before writing its own.

3. **Only recognized one version of your website's address.** The note only
   said "yes" to `unboxd.online`, not `www.unboxd.online` — same website,
   different address, and the check treated them as two different visitors.
   Fixed by listing both.

4. **The note didn't list every kind of ID the visitor might show.** Turns
   out the "note" isn't just a yes/no — it also has to list which specific
   pieces of identification are acceptable. Three different pieces of ID the
   website's own code was presenting (each with a fairly technical name) were
   missing from that list, one at a time, across three separate rounds of
   testing. After the third round, instead of adding them one by one as they
   kept surfacing, the whole known list was added at once so this stops
   happening piecemeal.

5. **A table nobody remembered existed.** Separately from the ID-check stuff:
   after fixing the CORS/ID-check issue, the browse page still failed —
   this time because of a genuinely different table (`PublicUser`) that
   holds public-facing profile info, which never got included when
   permissions were set up earlier. It wasn't visible as its own line of
   code — it was tucked inside a bigger request as a side detail, easy to
   miss on a first read. Fixed by granting it the same read access as the
   other tables.

6. **A profile picture link nobody's search caught.** When we moved everyone's
   real data onto the new server, every stored link that pointed at the old
   address needed updating to point at the new one. That update was found by
   searching for columns *named* something like "...Url" — which caught
   most of them, but missed a column called `profilePicture`, which holds a
   web address too, just without the word "url" in its name. Fixed by
   re-checking every column by its actual *contents* instead of trusting its
   *name* — a much more reliable way to search.

## The underlying lesson

Two different lessons, matching the two kinds of mistakes above:

- **Anything a bigger, managed system does for you invisibly has to be found
  and rebuilt by hand once you replace it — and the only way to be sure
  you've found everything is to actually use the real thing, the way a real
  person would, not just test that the wiring is connected.**
- **When checking "does anything reference X," search by what's actually
  there, not by what you expect the name to look like.** A search for
  "columns with 'url' in the name" feels thorough but isn't the same as
  "columns that actually contain a web address."
