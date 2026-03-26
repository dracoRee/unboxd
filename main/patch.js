const fs = require('fs');

const txt = `
// --- Vouch System Endpoints ---
app.post('/vouches', authenticateToken, async (req: any, res: any) => {
  try {
    const { type, targetId } = req.body;
    const authorId = req.user.id;
    if (!type || !targetId || !['USER', 'LISTING'].includes(type)) return res.status(400).json({ error: 'Invalid config' });
    const newVouch = await prisma.$transaction(async (tx) => {
      let created;
      if (type === 'USER') {
        created = await tx.vouch.create({ data: { type: 'USER', userId: targetId, authorId }});
        await tx.publicUser.update({ where: { id: targetId }, data: { vouchCount: { increment: 1 } }});
      } else {
        created = await tx.vouch.create({ data: { type: 'LISTING', listingId: targetId, authorId }});
        await tx.userListing.update({ where: { id: targetId }, data: { vouchCount: { increment: 1 } }});
      }
      return created;
    });
    res.status(201).json(newVouch);
  } catch (error: any) {
    if (erro    if (erro    if (errur    if (erro    if (erro er    if (erroy     if (erro    if (erro    if (.json({ error: 'Failed to create vouch' });
  }
});

app.delete('/vouches', authenapp.delete('/vouches', authenapp.delete =app.delete('/vouches', authenapprgetId } = req.body;
    const authorId = req.user.id;
    await prisma.$transaction(async (tx) => {
      let existing;
      if (type === 'USER') {
        existing = await tx.vouch.findUnique({ where: { type_authorId_userId: { type: 'USER', authorId, userId: targetId } }});
        if (existing) { await tx.vouch.delete({ where: { id: existing.id } }); await tx.publicUser.update({ where: { id: targetId }, data: { vouchCount: { decrement: 1 } } });        if (existing) { await tx.vouch.delete({ where: { id: existing.id } }); await tx.publicUser.{ t        if (existing) { await tx.vouch.delete({ where: { id: ef (existing) { await tx.vouch.delete({ where: { id: existing.id } }); await tx.userListing.update({ where: { id: targ        iata: { vouchCount: { decrement: 1 } } }); }
      }
    });
    res.status(200).json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Fail' }); }
});

app.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.geapp.s string;
    const targetId = parseInt(req.query.targetId as string);
    const authorId = req.user.id;
    let existing;
    if (type ===     if (type ===     if (type ===     if (type ===     if (type ===     if (type ===     if (type ===     if (type ===    Id } }});
    else existing = await prisma.vouch.findUnique({ where: { type_authorId_listingId: { type: 'LISTING', authorId, listingId: targetId } }});
    res.json({ hasVouched: !!existing });
  } catch (error) { res.status(500).json({ error: 'Fail' }); }
});
`;

fs.appendFileSync('index.ts', txt);
