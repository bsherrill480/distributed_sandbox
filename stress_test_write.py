import random
import asyncio
import time
import statistics as s
from aiohttp import ClientSession

async def fetch(url, session):
    t1 = time.time()
    body = {
        "resortId": 1,
        "day": 2,
        "skierId": random.randint(1, 40000),
        "liftId": random.randint(1, 40),
        "time": 1
    }
    async with session.post(url, data=body) as response:
        t2 = time.time()
        latency = t2 - t1
        return latency


async def bound_fetch(sem, url, session):
    # Getter function with semaphore.
    async with sem:
        return await fetch(url, session)


async def run(r):
    url = "http://localhost:3000/load/"
    tasks = []
    # create instance of Semaphore
    sem = asyncio.Semaphore(1000)

    # Create client session that will ensure we dont open new connection
    # per each request.
    async with ClientSession() as session:
        for i in range(r):
            skierId = random.randint(1, 1000)
            # pass Semaphore and session to every GET request
            task = asyncio.ensure_future(bound_fetch(sem, url.format(skierId), session))
            tasks.append(task)

        responses = await asyncio.gather(*tasks)
        print(s.mean(responses))

number = 800000
loop = asyncio.get_event_loop()

future = asyncio.ensure_future(run(number))
loop.run_until_complete(future)
