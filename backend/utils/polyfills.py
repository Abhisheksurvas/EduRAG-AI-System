"""
Backend utility polyfills and environment compatibility helpers.
Matches backend/src/utils/polyfills.ts
"""

class SimpleDOMMatrix:
    def __init__(self, init=None):
        self.a = 1
        self.b = 0
        self.c = 0
        self.d = 1
        self.e = 0
        self.f = 0
        self.is2D = True
        self.isIdentity = True

    def multiply(self):
        return self

    def inverse(self):
        return self

    def transformPoint(self, point):
        return point

class SimplePath2D:
    def __init__(self, path=None):
        pass

    def addPath(self): pass
    def closePath(self): pass
    def moveTo(self): pass
    def lineTo(self): pass
    def bezierCurveTo(self): pass
    def quadraticCurveTo(self): pass
    def arc(self): pass
    def arcTo(self): pass
    def ellipse(self): pass
    def rect(self): pass
